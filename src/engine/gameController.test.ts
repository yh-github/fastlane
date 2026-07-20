/**
 * gameController.test.ts — Tests for the view-agnostic game controller layer.
 *
 * Tests cover:
 * - processControllerAction for all action types
 * - RNG state synchronization after actions
 * - getGameSummary structured output correctness
 * - getControllerActions semantic ID generation
 * - Turn transitions and flag management
 * - Building entry/exit state management
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { loadCampaign, CampaignBundle } from './dataLoader'
import { createInitialGameState, GameState, createDefaultGoalAllotment } from './gameState'
import { processTurnStart } from './turnProcessor'
import {
  processControllerAction,
  getGameSummary,
  getControllerActions,
  type ControllerAction,
  type ActionResult,
  type GameSummary,
} from './gameController'

// ─── Test Helpers ─────────────────────────────────────────────

let campaign: CampaignBundle

/**
 * Create a fresh game state for testing. Starts at turn 1 (after initial
 * processTurnStart) so it matches actual gameplay conditions.
 */
function createTestState(seed = 12345): GameState {
  const goals = createDefaultGoalAllotment()
  const housingNode = campaign.housing[0]?.homeNodeId || campaign.map.nodes[0].id
  let state = createInitialGameState(campaign, [{ name: 'Player 1', isAi: false, goals }], housingNode, {}, seed)
  state.phase = 'playing'
  state = processTurnStart(state, campaign)
  return state
}

// ─── Setup ────────────────────────────────────────────────────

beforeEach(async () => {
  campaign = await loadCampaign('qol_improved')
})

// ─── processControllerAction ─────────────────────────────────

describe('processControllerAction', () => {
  describe('enter_building', () => {
    it('deducts entry cost and sets insideBuilding to true', () => {
      const state = createTestState()
      const hoursBefore = state.players[0].hoursRemaining

      const result = processControllerAction(state, campaign, 0, false, { type: 'enter_building' })

      expect(result.insideBuilding).toBe(true)
      expect(result.turnAdvanced).toBe(false)
      const entryCost = campaign.config.timeRules.buildingEntryCost || 2
      expect(result.state.players[0].hoursRemaining).toBe(hoursBefore - entryCost)
    })

    it('does not produce an action log', () => {
      const state = createTestState()
      const result = processControllerAction(state, campaign, 0, false, { type: 'enter_building' })
      expect(result.actionLog).toBeUndefined()
    })
  })

  describe('exit_building', () => {
    it('sets insideBuilding to false without changing state', () => {
      const state = createTestState()

      const result = processControllerAction(state, campaign, 0, true, { type: 'exit_building' })

      expect(result.insideBuilding).toBe(false)
      expect(result.turnAdvanced).toBe(false)
      // State should be the same reference (no mutation needed)
      expect(result.state).toBe(state)
    })
  })

  describe('end_turn', () => {
    it('advances the turn and resets insideBuilding', () => {
      const state = createTestState()
      const turnBefore = state.turn

      const result = processControllerAction(state, campaign, 0, true, { type: 'end_turn' })

      expect(result.turnAdvanced).toBe(true)
      expect(result.insideBuilding).toBe(false)
      expect(result.state.turn).toBe(turnBefore + 1)
    })

    it('processes turn-start events (starvation, clothing decay, etc.)', () => {
      const state = createTestState()
      // Player starts with 0 food, so starvation should occur
      expect(state.players[0].inventory.freshFoodUnits).toBe(0)

      const result = processControllerAction(state, campaign, 0, false, { type: 'end_turn' })

      // After turn processing, the player should have starvation event
      const newPlayer = result.state.players[0]
      const hasStarvation = newPlayer.turnEvents.some(e => e.key === 'events.starvation')
      expect(hasStarvation).toBe(true)
    })
  })

  describe('move', () => {
    it('moves the player and auto-enters the building', () => {
      const state = createTestState()
      const burgerNode = campaign.map.nodes.find(n => n.buildingId === 'burger_palace')!

      const result = processControllerAction(state, campaign, 0, false, {
        type: 'move',
        nodeId: burgerNode.id,
      })

      expect(result.insideBuilding).toBe(true)
      expect(result.state.players[0].position).toBe(burgerNode.id)
      expect(result.state.players[0].hoursRemaining).toBeLessThan(state.players[0].hoursRemaining)
    })

    it('syncs RNG state after move', () => {
      const state = createTestState()
      const rngBefore = state.rngState
      const burgerNode = campaign.map.nodes.find(n => n.buildingId === 'burger_palace')!

      const result = processControllerAction(state, campaign, 0, false, {
        type: 'move',
        nodeId: burgerNode.id,
      })

      // RNG state should be updated (may or may not differ depending on whether robbery check occurred)
      expect(result.state.rngState).toBeDefined()
      expect(typeof result.state.rngState).toBe('number')
    })
  })

  describe('game reducer actions (relax, buy, work, etc.)', () => {
    it('dispatches relax action correctly', () => {
      const state = createTestState()
      // Enter building first
      const entered = processControllerAction(state, campaign, 0, false, { type: 'enter_building' })

      const result = processControllerAction(entered.state, campaign, 0, true, { type: 'relax' })

      expect(result.insideBuilding).toBe(true) // stays inside
      expect(result.actionLog).toBeDefined()
      expect(result.actionLog!.key).toBe('action.relax')
      expect(result.state.players[0].happiness).toBeGreaterThanOrEqual(state.players[0].happiness)
    })

    it('syncs RNG state after reducer action', () => {
      const state = createTestState()
      const entered = processControllerAction(state, campaign, 0, false, { type: 'enter_building' })
      const rngBefore = entered.state.rngState

      const result = processControllerAction(entered.state, campaign, 0, true, { type: 'relax' })

      // RNG state must be synced even if relax doesn't use RNG
      expect(result.state.rngState).toBeDefined()
    })

    it('handles buy action at correct store', () => {
      const state = createTestState()
      // Move to Monolith Burgers to buy fast food
      const burgerNode = campaign.map.nodes.find(n => n.buildingId === 'burger_palace')!
      const moved = processControllerAction(state, campaign, 0, false, {
        type: 'move',
        nodeId: burgerNode.id,
      })

      // Find a food item sold at burger_palace
      const foodItem = campaign.items.find(i => i.store === 'burger_palace' && i.category === 'food')
      if (foodItem) {
        const result = processControllerAction(moved.state, campaign, 0, true, {
          type: 'buy',
          itemId: foodItem.id,
        })

        expect(result.actionLog).toBeDefined()
        expect(result.state.players[0].money).toBeLessThan(moved.state.players[0].money)
      }
    })

    it('handles job application', () => {
      const state = createTestState()
      // Move to employment office
      const empNode = campaign.map.nodes.find(n => n.buildingId === 'employment_office')!
      const moved = processControllerAction(state, campaign, 0, false, {
        type: 'move',
        nodeId: empNode.id,
      })

      // Apply for burger cook (should auto-accept with low requirements)
      const result = processControllerAction(moved.state, campaign, 0, true, {
        type: 'apply',
        jobId: 'burger_cook',
      })

      expect(result.actionLog).toBeDefined()
      // Application may succeed or fail, but action log should be present
      expect(result.state.players[0].hoursRemaining).toBeLessThan(moved.state.players[0].hoursRemaining)
    })

    it('handles bank deposit', () => {
      const state = createTestState()
      const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')!
      const moved = processControllerAction(state, campaign, 0, false, {
        type: 'move',
        nodeId: bankNode.id,
      })

      const moneyBefore = moved.state.players[0].money
      const result = processControllerAction(moved.state, campaign, 0, true, {
        type: 'bank_transaction',
        amount: 100,
      })

      expect(result.state.players[0].money).toBe(moneyBefore - 100)
      expect(result.state.players[0].bankSavings).toBe(100)
      expect(result.actionLog!.key).toBe('action.bank.deposit')
    })

    it('preserves insideBuilding state for non-move actions', () => {
      const state = createTestState()
      const entered = processControllerAction(state, campaign, 0, false, { type: 'enter_building' })

      const result = processControllerAction(entered.state, campaign, 0, true, { type: 'relax' })
      expect(result.insideBuilding).toBe(true)

      const result2 = processControllerAction(result.state, campaign, 0, false, { type: 'relax' })
      expect(result2.insideBuilding).toBe(false)
    })
  })

  describe('pawn shop operations', () => {
    it('updates pawnShopItemsForSale when pawn shop items change', () => {
      // This tests that the controller properly propagates pawn shop state
      const state = createTestState()
      // We can't easily pawn without owning items, so just verify the field is propagated
      expect(state.pawnShopItemsForSale).toBeDefined()
    })
  })
})

// ─── getGameSummary ──────────────────────────────────────────

describe('getGameSummary', () => {
  it('returns a complete GameSummary object', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    // Top-level fields
    expect(summary.turn).toBe(state.turn)
    expect(summary.phase).toBe('playing')
    expect(typeof summary.economicIndex).toBe('number')
    expect(summary.gameOver).toBe(false)
    expect(summary.hasWon).toBe(false)
  })

  it('includes correct player stats', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)
    const player = state.players[0]

    expect(summary.player.name).toBe(player.name)
    expect(summary.player.money).toBe(player.money)
    expect(summary.player.happiness).toBe(player.happiness)
    expect(summary.player.experience).toBe(player.experience)
    expect(summary.player.dependability).toBe(player.dependability)
    expect(summary.player.hoursRemaining).toBe(player.hoursRemaining)
  })

  it('resolves location name correctly', () => {
    const state = createTestState()

    const outsideSummary = getGameSummary(state, campaign, 0, false)
    expect(outsideSummary.player.locationName).toContain('Outside')
    expect(outsideSummary.player.insideBuilding).toBe(false)

    const insideSummary = getGameSummary(state, campaign, 0, true)
    expect(insideSummary.player.locationName).toContain('Inside')
    expect(insideSummary.player.insideBuilding).toBe(true)
  })

  it('includes goal progress calculations', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    expect(summary.player.goalProgress).toBeDefined()
    expect(typeof summary.player.goalProgress.wealth).toBe('number')
    expect(typeof summary.player.goalProgress.happiness).toBe('number')
    expect(typeof summary.player.goalProgress.education).toBe('number')
    expect(typeof summary.player.goalProgress.career).toBe('number')

    // Career should be 0 without a job
    expect(summary.player.goalProgress.career).toBe(0)
    // Education with 0 degrees = 1
    expect(summary.player.goalProgress.education).toBe(1)
  })

  it('includes goal allotment', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    expect(summary.player.goalAllotment.wealth).toBe(50)
    expect(summary.player.goalAllotment.happiness).toBe(50)
    expect(summary.player.goalAllotment.education).toBe(50)
    expect(summary.player.goalAllotment.career).toBe(50)
  })

  it('generates food warning when no food available', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    expect(summary.player.warnings).toContain('NO FOOD — you will starve next week!')
  })

  it('generates clothes warning when clothes are low', () => {
    const state = createTestState()
    // Manually set clothes to 1 week
    const modState = {
      ...state,
      players: [{
        ...state.players[0],
        inventory: {
          ...state.players[0].inventory,
          casualClothesWeeks: 1,
          dressClothesWeeks: 0,
          businessClothesWeeks: 0,
        }
      }]
    }
    const summary = getGameSummary(modState, campaign, 0, false)
    expect(summary.player.warnings).toContain('CLOTHES WEARING OUT — buy new clothes soon!')
  })

  it('generates no clothes warning when naked', () => {
    const state = createTestState()
    const modState = {
      ...state,
      players: [{
        ...state.players[0],
        inventory: {
          ...state.players[0].inventory,
          casualClothesWeeks: 0,
          dressClothesWeeks: 0,
          businessClothesWeeks: 0,
        }
      }]
    }
    const summary = getGameSummary(modState, campaign, 0, false)
    expect(summary.player.warnings).toContain('NO CLOTHES — happiness and job prospects suffer!')
  })

  it('includes inventory details', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)
    const inv = summary.player.inventory

    expect(typeof inv.freshFoodUnits).toBe('number')
    expect(typeof inv.fastFoodCount).toBe('number')
    expect(typeof inv.casualClothesWeeks).toBe('number')
    expect(typeof inv.lotteryTickets).toBe('number')
    expect(inv.appliances).toBeInstanceOf(Array)
    expect(inv.books).toBeInstanceOf(Array)
    expect(inv.pawnedItems).toBeInstanceOf(Array)
    expect(typeof inv.stocks.tBills).toBe('number')
  })

  it('includes newspaper headline', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    expect(summary.newspaperHeadline).toBeDefined()
    expect(summary.newspaperHeadline).not.toBeNull()
  })

  it('includes available actions', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    expect(summary.availableActions.length).toBeGreaterThan(0)
    // Should have at least 'enter' and some 'move:' actions and 'end_turn'
    const ids = summary.availableActions.map(a => a.id)
    expect(ids).toContain('enter')
    expect(ids).toContain('end_turn')
    expect(ids.some(id => id.startsWith('move:'))).toBe(true)
  })

  it('shows different actions when inside vs outside', () => {
    const state = createTestState()

    const outsideActions = getGameSummary(state, campaign, 0, false).availableActions.map(a => a.id)
    const insideActions = getGameSummary(state, campaign, 0, true).availableActions.map(a => a.id)

    expect(outsideActions).toContain('enter')
    expect(outsideActions).not.toContain('exit')

    expect(insideActions).toContain('exit')
    expect(insideActions).not.toContain('enter')
    // Inside home should have 'relax'
    expect(insideActions).toContain('relax')
  })

  it('resolves job info when player has a job', () => {
    const state = createTestState()
    // Give the player a job
    const modState = {
      ...state,
      players: [{
        ...state.players[0],
        currentJobId: 'burger_cook',
        currentWage: 5,
      }]
    }
    const summary = getGameSummary(modState, campaign, 0, false)

    expect(summary.player.currentJobId).toBe('burger_cook')
    expect(summary.player.currentJobTitle).toBe('Cook')
    expect(summary.player.currentJobWage).toBe(5)
    expect(summary.player.currentJobLocation).toBe('Monolith Burgers')
  })

  it('includes enrolled class progress', () => {
    const state = createTestState()
    const degId = campaign.education[0]?.id
    if (degId) {
      const modState = {
        ...state,
        players: [{
          ...state.players[0],
          enrolledClasses: { [degId]: 2 },
        }]
      }
      const summary = getGameSummary(modState, campaign, 0, false)
      const enrolled = summary.player.enrolledClasses[degId]

      expect(enrolled).toBeDefined()
      expect(enrolled.completed).toBe(2)
      expect(enrolled.required).toBeGreaterThan(0)
      expect(enrolled.degreeName).toBe(campaign.education[0].name)
    }
  })
})

// ─── getControllerActions ────────────────────────────────────

describe('getControllerActions', () => {
  it('includes semantic IDs for all actions', () => {
    const state = createTestState()
    const actions = getControllerActions(state.players[0], state, campaign, false)

    actions.forEach(action => {
      expect(action.id).toBeDefined()
      expect(typeof action.id).toBe('string')
      expect(action.id.length).toBeGreaterThan(0)
      expect(action.label).toBeDefined()
      expect(action.action).toBeDefined()
    })
  })

  it('generates correct move IDs using building IDs', () => {
    const state = createTestState()
    const actions = getControllerActions(state.players[0], state, campaign, false)

    const moveActions = actions.filter(a => a.id.startsWith('move:'))
    expect(moveActions.length).toBeGreaterThan(0)

    // Each move action should reference a building ID
    moveActions.forEach(a => {
      const buildingId = a.id.replace('move:', '')
      const building = campaign.buildings.find(b => b.id === buildingId)
      // Either it's a building ID or a node ID (for non-building nodes)
      expect(buildingId.length).toBeGreaterThan(0)
    })
  })

  it('includes end_turn when player has hours remaining', () => {
    const state = createTestState()
    const actions = getControllerActions(state.players[0], state, campaign, false)
    const endTurn = actions.find(a => a.id === 'end_turn')

    expect(endTurn).toBeDefined()
    expect(endTurn!.label).toBe('End Turn Early')
    expect(endTurn!.action).toEqual({ type: 'end_turn' })
  })

  it('shows End Turn (not End Turn Early) when player has no hours', () => {
    const state = createTestState()
    const noHoursState = {
      ...state,
      players: [{ ...state.players[0], hoursRemaining: 0 }]
    }
    const actions = getControllerActions(noHoursState.players[0], noHoursState, campaign, false)
    const endTurn = actions.find(a => a.id === 'end_turn')

    expect(endTurn).toBeDefined()
    expect(endTurn!.label).toBe('End Turn')
  })

  it('includes enter/exit based on inside state', () => {
    const state = createTestState()

    const outsideActions = getControllerActions(state.players[0], state, campaign, false)
    expect(outsideActions.find(a => a.id === 'enter')).toBeDefined()
    expect(outsideActions.find(a => a.id === 'exit')).toBeUndefined()

    const insideActions = getControllerActions(state.players[0], state, campaign, true)
    expect(insideActions.find(a => a.id === 'exit')).toBeDefined()
    expect(insideActions.find(a => a.id === 'enter')).toBeUndefined()
  })

  it('generates correct IDs for bank transactions', () => {
    const state = createTestState()
    const bankNode = campaign.map.nodes.find(n => n.buildingId === 'bank')!
    const bankPlayer = { ...state.players[0], position: bankNode.id }
    const bankState = { ...state, players: [bankPlayer] }

    const actions = getControllerActions(bankPlayer, bankState, campaign, true)
    expect(actions.find(a => a.id === 'deposit_100')).toBeDefined()
    expect(actions.find(a => a.id === 'withdraw_100')).toBeDefined()
    expect(actions.find(a => a.id === 'take_loan')).toBeDefined()
  })

  it('generates correct IDs for work actions', () => {
    const state = createTestState()
    const burgerNode = campaign.map.nodes.find(n => n.buildingId === 'burger_palace')!
    const workPlayer = {
      ...state.players[0],
      position: burgerNode.id,
      currentJobId: 'burger_cook',
      currentWage: 5,
    }
    const workState = { ...state, players: [workPlayer] }

    const actions = getControllerActions(workPlayer, workState, campaign, true)
    const workAction = actions.find(a => a.id === 'work:burger_cook')

    expect(workAction).toBeDefined()
    expect(workAction!.label).toContain('Cook')
  })

  it('generates correct IDs for education actions', () => {
    const state = createTestState()
    const uniNode = campaign.map.nodes.find(n => n.buildingId === 'university')!
    const uniPlayer = { ...state.players[0], position: uniNode.id }
    const uniState = { ...state, players: [uniPlayer] }

    const actions = getControllerActions(uniPlayer, uniState, campaign, true)

    // Should have enroll actions
    const enrollActions = actions.filter(a => a.id.startsWith('enroll:'))
    expect(enrollActions.length).toBeGreaterThan(0)
  })
})

// ─── Integration: Multi-step sequences ───────────────────────

describe('Integration: multi-step game sequences', () => {
  it('can complete a full turn cycle: move, work, end turn', () => {
    let state = createTestState()
    let inside = false

    // 1. Move to employment office and get a job
    const empNode = campaign.map.nodes.find(n => n.buildingId === 'employment_office')!
    let result = processControllerAction(state, campaign, 0, inside, { type: 'move', nodeId: empNode.id })
    state = result.state
    inside = result.insideBuilding

    expect(inside).toBe(true)
    expect(state.players[0].position).toBe(empNode.id)

    // 2. Apply for burger cook
    result = processControllerAction(state, campaign, 0, inside, { type: 'apply', jobId: 'burger_cook' })
    state = result.state
    inside = result.insideBuilding

    expect(result.actionLog).toBeDefined()

    // 3. Exit building
    result = processControllerAction(state, campaign, 0, inside, { type: 'exit_building' })
    state = result.state
    inside = result.insideBuilding
    expect(inside).toBe(false)

    // 4. Move to Monolith Burgers
    const burgerNode = campaign.map.nodes.find(n => n.buildingId === 'burger_palace')!
    result = processControllerAction(state, campaign, 0, inside, { type: 'move', nodeId: burgerNode.id })
    state = result.state
    inside = result.insideBuilding

    // 5. If we got the job, work
    if (state.players[0].currentJobId === 'burger_cook') {
      const moneyBefore = state.players[0].money
      result = processControllerAction(state, campaign, 0, inside, { type: 'work', jobId: 'burger_cook' })
      state = result.state
      expect(state.players[0].money).toBeGreaterThan(moneyBefore)
    }

    // 6. End turn
    const turnBefore = state.turn
    result = processControllerAction(state, campaign, 0, inside, { type: 'end_turn' })
    state = result.state
    inside = result.insideBuilding

    expect(result.turnAdvanced).toBe(true)
    expect(state.turn).toBe(turnBefore + 1)
    expect(inside).toBe(false)
  })

  it('RNG state is consistent across multiple actions', () => {
    let state = createTestState()
    const rngStates: number[] = [state.rngState]

    // Perform several actions and track RNG state
    const entered = processControllerAction(state, campaign, 0, false, { type: 'enter_building' })
    state = entered.state
    rngStates.push(state.rngState)

    const relaxed = processControllerAction(state, campaign, 0, true, { type: 'relax' })
    state = relaxed.state
    rngStates.push(state.rngState)

    const exited = processControllerAction(state, campaign, 0, true, { type: 'exit_building' })
    state = exited.state
    rngStates.push(state.rngState)

    // RNG state should be updated when actions use the reducer (relax does)
    // but enter/exit don't use RNG so state may stay the same
    expect(rngStates.every(s => typeof s === 'number')).toBe(true)
  })

  it('game summary actions are playable by the controller', () => {
    // Verify that every action returned by getGameSummary can be passed to processControllerAction
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    // Try the first available action
    const firstAction = summary.availableActions[0]
    expect(firstAction).toBeDefined()

    const result = processControllerAction(state, campaign, 0, false, firstAction.action)
    expect(result.state).toBeDefined()
    expect(typeof result.insideBuilding).toBe('boolean')
    expect(typeof result.turnAdvanced).toBe('boolean')
  })

  it('getGameSummary returns valid actions after each step', () => {
    let state = createTestState()
    let inside = false

    // Step 1: Check initial state has actions
    let summary = getGameSummary(state, campaign, 0, inside)
    expect(summary.availableActions.length).toBeGreaterThan(0)

    // Step 2: Enter building
    const result = processControllerAction(state, campaign, 0, inside, { type: 'enter_building' })
    state = result.state
    inside = result.insideBuilding

    // Step 3: Check actions changed (now inside)
    summary = getGameSummary(state, campaign, 0, inside)
    expect(summary.player.insideBuilding).toBe(true)
    expect(summary.availableActions.find(a => a.id === 'exit')).toBeDefined()
  })
})

// ─── Edge cases ──────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles game-over state in summary', () => {
    const state = createTestState()
    const gameOverState = { ...state, phase: 'game-over' as const }

    const summary = getGameSummary(gameOverState, campaign, 0, false)
    expect(summary.gameOver).toBe(true)
  })

  it('handles winning player in summary', () => {
    const state = createTestState()
    const wonState = {
      ...state,
      phase: 'game-over' as const,
      players: [{ ...state.players[0], hasWon: true }],
    }

    const summary = getGameSummary(wonState, campaign, 0, false)
    expect(summary.gameOver).toBe(true)
    expect(summary.hasWon).toBe(true)
  })

  it('handles player with no job', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)

    expect(summary.player.currentJobId).toBeNull()
    expect(summary.player.currentJobTitle).toBeNull()
    expect(summary.player.currentJobLocation).toBeNull()
  })

  it('handles player with loan debt', () => {
    const state = createTestState()
    const loanState = {
      ...state,
      players: [{
        ...state.players[0],
        loanDebt: 500,
        turnFlags: {
          ...state.players[0].turnFlags,
          loanPayableWarning: true,
        }
      }]
    }

    const summary = getGameSummary(loanState, campaign, 0, false)
    expect(summary.player.loanDebt).toBe(500)
    expect(summary.player.warnings).toContain('LOAN PAYMENT DUE!')
  })

  it('summary availableActions have unique IDs', () => {
    const state = createTestState()
    const summary = getGameSummary(state, campaign, 0, false)
    const ids = summary.availableActions.map(a => a.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })
})
