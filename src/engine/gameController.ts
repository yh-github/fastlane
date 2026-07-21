/**
 * gameController.ts — View-agnostic game controller layer.
 *
 * Encapsulates the orchestration logic currently duplicated between
 * the GUI (useGameEngine.ts) and CLI (cli/index.ts). Both views
 * call engine functions directly — this controller sits between them.
 *
 * The controller does NOT manage React state or animations — those
 * are GUI concerns. It DOES manage: action dispatch with RNG sync,
 * building entry/exit state, and turn transitions.
 *
 * All functions are pure or return new state (immutable pattern
 * matching the engine).
 */

import { GameState, PlayerState, GameEvent, recalculatePlayerEffects } from './gameState'
import { gameReducer, type GameAction, type ReducerContext } from './gameReducer'
import { processTurnStart } from './turnProcessor'
import { getAvailableActions, type ActionChoice } from './actionProvider'
import { resolveDecision, type EngineDecision, type ReplayContext } from './replayTypes'
import { Random } from '../utils/rng'
import { CampaignBundle } from './dataLoader'
import { calcWealthProgress, calcEducationProgress, calcCareerProgress } from './statMath'
import { calcLiquidAssets } from './economyEngine'
import { spendHours } from './timeManager'
import { calcRequiredLessons } from './educationEngine'

// ─── Controller Types ───────────────────────────────────────────

/** Extended action type that includes controller-level actions */
export type ControllerAction =
  | GameAction
  | { type: 'enter_building' }
  | { type: 'exit_building' }
  | { type: 'end_turn' }

/** Result of processing an action through the controller */
export interface ActionResult {
  state: GameState
  insideBuilding: boolean
  actionLog?: GameEvent
  turnAdvanced: boolean
  outEngineDecisions?: EngineDecision[]
}

/** Structured game state summary for display (by any view) */
export interface GameSummary {
  turn: number
  phase: string
  economicIndex: number
  player: {
    name: string
    money: number
    bankSavings: number
    happiness: number
    experience: number
    dependability: number
    relaxation: number
    hoursRemaining: number
    position: string
    locationName: string
    insideBuilding: boolean
    currentJobId: string | null
    currentJobTitle: string | null
    currentJobWage: number
    currentJobLocation: string | null
    currentHousingId: string
    loanDebt: number
    rentPaidUntilWeek: number
    rentDue: boolean
    degrees: string[]
    enrolledClasses: Record<string, { completed: number; required: number; degreeName: string }>
    inventory: {
      freshFoodUnits: number
      fastFoodCount: number
      casualClothesWeeks: number
      dressClothesWeeks: number
      businessClothesWeeks: number
      selectedClothes: string
      appliances: string[]
      books: string[]
      lotteryTickets: number
      stocks: { tBills: number; holdings: Record<string, number> }
      pawnedItems: { itemId: string; redeemCost: number }[]
    }
    goalAllotment: { wealth: number; happiness: number; education: number; career: number }
    goalProgress: { wealth: number; happiness: number; education: number; career: number }
    warnings: string[]
  }
  turnEvents: GameEvent[]
  weekendResult?: { event: GameEvent; cost: number }
  newspaperHeadline: GameEvent | null
  availableActions: { id: string; label: string; action: ControllerAction }[]
  gameOver: boolean
  hasWon: boolean
}

// ─── Controller Functions ───────────────────────────────────────

/**
 * Process a controller-level action and return the full updated state.
 *
 * Handles enter_building, exit_building, end_turn, move (auto-enters),
 * and all game reducer actions with proper RNG synchronization.
 */
export function processControllerAction(
  state: GameState,
  campaign: CampaignBundle,
  playerIndex: number,
  insideBuilding: boolean,
  action: ControllerAction,
  inEngineDecisions?: EngineDecision[]
): ActionResult {
  const player = state.players[playerIndex]

  switch (action.type) {
    case 'enter_building': {
      const entryCost = campaign.config.timeRules.buildingEntryCost || 2
      const updatedPlayer = spendHours(player, entryCost)
      const newState = updatePlayerInState(state, playerIndex, updatedPlayer)
      return {
        state: newState,
        insideBuilding: true,
        turnAdvanced: false,
      }
    }

    case 'exit_building': {
      return {
        state,
        insideBuilding: false,
        turnAdvanced: false,
      }
    }

    case 'end_turn': {
      let outDecisions: EngineDecision[] = []
      const replayContext: ReplayContext = { inDecisions: inEngineDecisions, outDecisions }
      const newState = processTurnStart(state, campaign, replayContext)
      return {
        state: newState,
        insideBuilding: false,
        turnAdvanced: true,
        outEngineDecisions: outDecisions
      }
    }

    case 'move': {
      const rng = new Random(state.rngState)
      const context: ReducerContext = {
        campaign,
        rules: state.rules,
        turn: state.turn,
        economicIndex: state.economicIndex,
        rng,
        state,
        engineDecisions: inEngineDecisions
      }
      const result = gameReducer(player, action, context)
      let newState = updatePlayerInState(state, playerIndex, result.updatedPlayer)
      newState = { ...newState, rngState: rng.getState() }
      if (result.updatedPawnShopItemsForSale) {
        newState = { ...newState, pawnShopItemsForSale: result.updatedPawnShopItemsForSale }
      }
      return {
        state: newState,
        insideBuilding: true,
        actionLog: result.actionLog,
        turnAdvanced: false,
        outEngineDecisions: result.outEngineDecisions
      }
    }

    default: {
      // All other GameAction types — dispatch through gameReducer
      const rng = new Random(state.rngState)
      const context: ReducerContext = {
        campaign,
        rules: state.rules,
        turn: state.turn,
        economicIndex: state.economicIndex,
        rng,
        state,
        engineDecisions: inEngineDecisions
      }
      const result = gameReducer(player, action as GameAction, context)
      let newState = updatePlayerInState(state, playerIndex, result.updatedPlayer)
      newState = { ...newState, rngState: rng.getState() }
      if (result.updatedPawnShopItemsForSale) {
        newState = { ...newState, pawnShopItemsForSale: result.updatedPawnShopItemsForSale }
      }
      return {
        state: newState,
        insideBuilding,
        actionLog: result.actionLog,
        turnAdvanced: false,
        outEngineDecisions: result.outEngineDecisions
      }
    }
  }
}

/**
 * Build a complete structured summary of the current game state
 * suitable for display by any view (CLI, GUI, JSON API).
 */
export function getGameSummary(
  state: GameState,
  campaign: CampaignBundle,
  playerIndex: number,
  insideBuilding: boolean
): GameSummary {
  const player = state.players[playerIndex]
  const currentNode = campaign.map.nodes.find(n => n.id === player.position)

  // Resolve location name
  let locationName = currentNode?.id || 'Unknown'
  if (currentNode?.buildingId) {
    const bDef = campaign.buildings.find(b => b.id === currentNode.buildingId)
    if (bDef) locationName = `${bDef.name} (${insideBuilding ? 'Inside' : 'Outside'})`
  }

  // Resolve job info
  const jobDef = player.currentJobId
    ? campaign.jobs.find(j => j.id === player.currentJobId)
    : null
  const jobBuilding = jobDef
    ? campaign.buildings.find(b => b.id === jobDef.locationId)
    : null

  // Calculate goal progress
  const liquidAssets = calcLiquidAssets(player, campaign, state.economicIndex, state.turn)
  const wealthProgress = calcWealthProgress(liquidAssets)
  const educationProgress = calcEducationProgress(player.degrees.length)
  const careerProgress = calcCareerProgress(player.dependability, player.currentJobId !== null)

  // Build enrolled classes with progress info
  const enrolledClasses: Record<string, { completed: number; required: number; degreeName: string }> = {}
  for (const [degId, lessonsCompleted] of Object.entries(player.enrolledClasses)) {
    const degDef = campaign.education.find(d => d.id === degId)
    if (degDef) {
      enrolledClasses[degId] = {
        completed: lessonsCompleted,
        required: calcRequiredLessons(player, degDef),
        degreeName: degDef.name,
      }
    }
  }

  // Build warnings
  const warnings: string[] = []
  const fastFoodCount = player.inventory.fastFoodItems?.length || 0
  if (player.inventory.freshFoodUnits === 0 && fastFoodCount === 0) {
    warnings.push('NO FOOD — you will starve next week!')
  }
  const clothesScore = player.inventory.casualClothesWeeks + player.inventory.dressClothesWeeks + player.inventory.businessClothesWeeks
  if (clothesScore <= 1 && clothesScore > 0) {
    warnings.push('CLOTHES WEARING OUT — buy new clothes soon!')
  }
  if (clothesScore === 0) {
    warnings.push('NO CLOTHES — happiness and job prospects suffer!')
  }
  if (!player.turnFlags.rentPaidThisTurn && state.turn >= player.rentPaidUntilWeek) {
    warnings.push('RENT DUE!')
  }
  if (player.loanDebt > 0 && player.turnFlags.loanPayableWarning) {
    warnings.push('LOAN PAYMENT DUE!')
  }

  // Build available actions with semantic IDs
  const availableActions = getControllerActions(player, state, campaign, insideBuilding)

  return {
    turn: state.turn,
    phase: state.phase,
    economicIndex: state.economicIndex,
    player: {
      name: player.name,
      money: player.money,
      bankSavings: player.bankSavings,
      happiness: player.happiness,
      experience: player.experience,
      dependability: player.dependability,
      relaxation: player.relaxation,
      hoursRemaining: player.hoursRemaining,
      position: player.position,
      locationName,
      insideBuilding,
      currentJobId: player.currentJobId,
      currentJobTitle: jobDef?.title || null,
      currentJobWage: player.currentWage,
      currentJobLocation: jobBuilding?.name || null,
      currentHousingId: player.currentHousingId,
      loanDebt: player.loanDebt,
      rentPaidUntilWeek: player.rentPaidUntilWeek,
      rentDue: !player.turnFlags.rentPaidThisTurn && state.turn >= player.rentPaidUntilWeek,
      degrees: player.degrees,
      enrolledClasses,
      inventory: {
        freshFoodUnits: player.inventory.freshFoodUnits,
        fastFoodCount,
        casualClothesWeeks: player.inventory.casualClothesWeeks,
        dressClothesWeeks: player.inventory.dressClothesWeeks,
        businessClothesWeeks: player.inventory.businessClothesWeeks,
        selectedClothes: player.inventory.selectedClothes || 'none',
        appliances: player.inventory.appliances.map(a => a.id),
        books: player.inventory.books,
        lotteryTickets: player.inventory.lotteryTickets,
        stocks: {
          tBills: player.inventory.stocks.tBills,
          holdings: { ...player.inventory.stocks.holdings },
        },
        pawnedItems: (player.inventory.pawnedItems || []).map(p => ({
          itemId: p.itemId,
          redeemCost: p.redeemCost,
        })),
      },
      goalAllotment: { ...player.goalAllotment },
      goalProgress: {
        wealth: wealthProgress,
        happiness: player.happiness,
        education: educationProgress,
        career: careerProgress,
      },
      warnings,
    },
    turnEvents: player.turnEvents,
    weekendResult: player.weekendResult
      ? { event: player.weekendResult.event, cost: player.weekendResult.cost }
      : undefined,
    newspaperHeadline: player.newspaperHeadline,
    availableActions,
    gameOver: state.phase === 'game-over',
    hasWon: player.hasWon === true,
  }
}

/**
 * Wraps getAvailableActions but adds semantic string IDs to each action.
 * IDs are human-readable: enter, exit, move:bank, work:cook, buy:casual_clothes, etc.
 */
export function getControllerActions(
  player: PlayerState,
  state: GameState,
  campaign: CampaignBundle,
  insideBuilding: boolean
): { id: string; label: string; action: ControllerAction }[] {
  const rawActions = getAvailableActions(player, state, campaign, insideBuilding)
  const result: { id: string; label: string; action: ControllerAction }[] = []

  for (const choice of rawActions) {
    const id = buildActionId(choice, campaign)
    result.push({ id, label: choice.label, action: choice.action as ControllerAction })
  }

  // Always offer end_turn: early end when hours remain, mandatory when hours exhausted
  result.push({
    id: 'end_turn',
    label: player.hoursRemaining > 0 ? 'End Turn Early' : 'End Turn',
    action: { type: 'end_turn' },
  })

  return result
}

// ─── Internal Helpers ───────────────────────────────────────────

/**
 * Replace a single player in the state, returning a new state object.
 */
function updatePlayerInState(state: GameState, playerIndex: number, player: PlayerState): GameState {
  const newPlayers = [...state.players]
  newPlayers[playerIndex] = player
  return { ...state, players: newPlayers }
}

/**
 * Build a human-readable semantic ID for an action choice.
 */
function buildActionId(choice: ActionChoice, campaign: CampaignBundle): string {
  const action = choice.action

  switch (action.type) {
    case 'enter_building':
      return 'enter'
    case 'exit_building':
      return 'exit'
    case 'move':
      return buildMoveId(action.nodeId, campaign)
    case 'work':
      return buildWorkId(action.jobId, campaign)
    case 'apply':
      return buildApplyId(action.jobId, campaign)
    case 'buy':
      return `buy:${action.itemId}`
    case 'enroll':
      return `enroll:${action.degreeId}`
    case 'study':
      return `study:${action.degreeId}`
    case 'relax':
      return 'relax'
    case 'bank_transaction':
      return action.amount > 0 ? `deposit_${action.amount}` : `withdraw_${Math.abs(action.amount)}`
    case 'take_loan':
      return 'take_loan'
    case 'pay_loan':
      return 'pay_loan'
    case 'rent_transaction':
      return 'pay_rent'
    case 'move_apartment':
      return `move_apartment:${action.housingId}`
    case 'pay_rent_advance':
      return `pay_rent_advance_${action.amount}`
    case 'ask_rent_extension':
      return 'ask_rent_extension'
    case 'open_broker':
      return 'open_broker'
    case 'buy_stock':
      return `buy_stock:${action.stockId}_${action.quantity}`
    case 'sell_stock':
      return `sell_stock:${action.stockId}_${action.quantity}`
    case 'pawn_item':
      return `pawn:${action.item.id}`
    case 'redeem_item':
      return `redeem:${action.item.itemId}`
    case 'buy_pawn_item':
      return `buy_pawn:${action.item.itemId}`
    case 'change_clothes':
      return `change_clothes:${action.clothes}`
    default:
      return 'unknown'
  }
}

function buildMoveId(nodeId: string, campaign: CampaignBundle): string {
  const node = campaign.map.nodes.find(n => n.id === nodeId)
  if (node?.buildingId) {
    const bDef = campaign.buildings.find(b => b.id === node.buildingId)
    if (bDef) {
      return `move:${bDef.id}`
    }
  }
  return `move:${nodeId}`
}

function buildWorkId(jobId: string, campaign: CampaignBundle): string {
  const job = campaign.jobs.find(j => j.id === jobId)
  if (job) {
    return `work:${job.id}`
  }
  return `work:${jobId}`
}

function buildApplyId(jobId: string, campaign: CampaignBundle): string {
  const job = campaign.jobs.find(j => j.id === jobId)
  if (job) {
    return `apply:${job.id}`
  }
  return `apply:${jobId}`
}
