import fs from 'fs'
import path from 'path'
import readline from 'readline'

// Polyfill fetch for node
const originalFetch = global.fetch;
global.fetch = async (url: string | URL | globalThis.Request, init?: RequestInit): Promise<Response> => {
  const urlStr = url.toString();
  if (urlStr.startsWith('/campaigns/')) {
    const filePath = path.join(process.cwd(), 'public', urlStr);
    try {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      return {
        ok: true,
        json: async () => JSON.parse(data),
        text: async () => data,
        headers: new Headers({ 'content-type': 'application/json' }),
        status: 200,
        statusText: 'OK'
      } as any;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          headers: new Headers()
        } as any;
      }
      throw err;
    }
  }
  if (originalFetch) return originalFetch(url, init);
  throw new Error(`fetch polyfill: unhandled URL ${urlStr}`);
};

import { loadCampaign, CampaignBundle } from '../engine/dataLoader'
import { createInitialGameState, GameState, createDefaultGoalAllotment } from '../engine/gameState'
import { processTurnStart } from '../engine/turnProcessor'
import {
  processControllerAction,
  getGameSummary,
  GameSummary,
  ControllerAction,
} from '../engine/gameController'

const JSON_MODE = process.argv.includes('--json')

async function main() {
  if (!JSON_MODE) console.log("Loading campaign...")
  const campaign = await loadCampaign('qol_improved')

  const goals = createDefaultGoalAllotment()
  const housingNode = campaign.housing[0]?.homeNodeId || campaign.map.nodes[0].id

  let state = createInitialGameState(campaign, [{ name: 'Player 1', isAi: false, goals }], housingNode, {}, 12345)
  state.phase = 'playing'

  let insideBuilding = false

  // In JSON mode: no stdout echo, queue-based line reading to prevent races
  // In normal mode: standard readline with prompts
  const rl = readline.createInterface({
    input: process.stdin,
    output: JSON_MODE ? undefined : process.stdout,
    terminal: !JSON_MODE,
  })

  const question = (query: string): Promise<string> =>
    new Promise(resolve => rl.question(query, resolve))

  // Queue-based line reader (JSON mode only): lines are buffered as they arrive,
  // so readLine() never misses input even with fast piped stdin.
  // NOT used in normal mode where readline's question() handles its own events.
  const lineQueue: string[] = []
  let lineWaiter: ((line: string) => void) | null = null

  if (JSON_MODE) {
    rl.on('line', (line: string) => {
      if (lineWaiter) {
        const resolve = lineWaiter
        lineWaiter = null
        resolve(line)
      } else {
        lineQueue.push(line)
      }
    })
  }

  const readLine = (): Promise<string> =>
    new Promise(resolve => {
      if (lineQueue.length > 0) {
        resolve(lineQueue.shift()!)
      } else {
        lineWaiter = resolve
      }
    })

  // ─── Process the initial turn ───────────────────────────────
  // Turn 0 → 1: run processTurnStart to generate events for week 1
  state = processTurnStart(state, campaign)
  insideBuilding = false

  if (JSON_MODE) {
    await jsonLoop()
  } else {
    await normalLoop()
  }

  // ─── Normal (human-readable) mode ───────────────────────────

  async function normalLoop() {
    // Show the initial turn events
    showTurnReport(state, campaign)
    await question("Press Enter to start next week...")

    while (true) {
      const player = state.players[0]

      // Check game over
      if (state.phase === 'game-over') {
        const summary = getGameSummary(state, campaign, 0, insideBuilding)
        console.log(`\n🏆 GAME OVER! ${summary.hasWon ? 'YOU WIN!' : 'Game ended.'}`)
        printFinalStats(summary)
        rl.close()
        break
      }

      // Display current state
      printState(state, campaign, insideBuilding)

      const summary = getGameSummary(state, campaign, 0, insideBuilding)
      const actions = summary.availableActions

      console.log("\nOptions:")
      actions.forEach((opt, idx) => {
        console.log(`${idx + 1}. ${opt.label}`)
      })
      console.log("99. View Campaign Encyclopedia (Jobs, Items, Education)")
      console.log("0. Quit Game")

      const ans = await question("\nSelect an option: ")
      const choice = parseInt(ans.trim())

      if (isNaN(choice)) {
        console.log("\n❌ Please enter a number.")
        continue
      }

      if (choice === 0) {
        console.log("Goodbye!")
        rl.close()
        break
      }

      if (choice === 99) {
        console.log("\n=== CAMPAIGN ENCYCLOPEDIA ===")
        console.log(JSON.stringify({
          jobs: campaign.jobs,
          education: campaign.education,
          items: campaign.items,
        }, null, 2))
        console.log("==============================\n")
        continue
      }

      if (choice >= 1 && choice <= actions.length) {
        const selected = actions[choice - 1]
        const result = processControllerAction(state, campaign, 0, insideBuilding, selected.action)

        state = result.state
        insideBuilding = result.insideBuilding

        if (result.actionLog) {
          const msg = typeof result.actionLog.key === 'string' ? result.actionLog.key : JSON.stringify(result.actionLog)
          console.log(`\n==> Action Result: ${msg} `, result.actionLog.params || "")
        }

        if (result.turnAdvanced) {
          // Mark flags so gameplay resumes properly
          const p = state.players[0]
          state = {
            ...state,
            players: [
              { ...p, turnFlags: { ...p.turnFlags, hasSeenEvents: true, hasSeenWeekend: true } },
              ...state.players.slice(1),
            ],
          }

          showTurnReport(state, campaign)
          await question("Press Enter to start next week...")
        }
      } else {
        console.log("\n❌ Invalid choice.")
      }
    }
  }

  // ─── JSON mode ──────────────────────────────────────────────

  async function jsonLoop() {
    // Emit initial state
    const initialSummary = getGameSummary(state, campaign, 0, insideBuilding)
    console.log(JSON.stringify(initialSummary))

    // Mark events as seen
    {
      const p = state.players[0]
      state = {
        ...state,
        players: [
          { ...p, turnFlags: { ...p.turnFlags, hasSeenEvents: true, hasSeenWeekend: true } },
          ...state.players.slice(1),
        ],
      }
    }

    while (true) {
      if (state.phase === 'game-over') {
        break
      }

      const line = await readLine()
      let input: { action: string }
      try {
        input = JSON.parse(line)
      } catch {
        console.log(JSON.stringify({ error: 'Invalid JSON input' }))
        continue
      }

      if (input.action === 'quit') {
        break
      }

      if (input.action === 'encyclopedia') {
        console.log(JSON.stringify({
          jobs: campaign.jobs,
          education: campaign.education,
          items: campaign.items,
        }))
        continue
      }

      // Find the matching action by semantic ID
      const summary = getGameSummary(state, campaign, 0, insideBuilding)
      const match = summary.availableActions.find(a => a.id === input.action)

      if (!match) {
        console.log(JSON.stringify({
          error: `Unknown action: ${input.action}`,
          availableActions: summary.availableActions.map(a => a.id),
        }))
        continue
      }

      const result = processControllerAction(state, campaign, 0, insideBuilding, match.action)
      state = result.state
      insideBuilding = result.insideBuilding

      if (result.turnAdvanced) {
        const p = state.players[0]
        state = {
          ...state,
          players: [
            { ...p, turnFlags: { ...p.turnFlags, hasSeenEvents: true, hasSeenWeekend: true } },
            ...state.players.slice(1),
          ],
        }
      }

      const newSummary = getGameSummary(state, campaign, 0, insideBuilding)
      console.log(JSON.stringify(newSummary))
    }

    rl.close()
  }

  // ─── Display Helpers ────────────────────────────────────────

  function printState(state: GameState, campaign: CampaignBundle, insideBuilding: boolean) {
    const summary = getGameSummary(state, campaign, 0, insideBuilding)
    const p = summary.player

    console.log(`\n======================================================`)
    console.log(`--- WEEK ${summary.turn} | HOURS LEFT: ${p.hoursRemaining} | ECONOMY: ${summary.economicIndex} ---`)
    console.log(`Money: $${p.money} | Happiness: ${p.happiness} | Exp: ${p.experience} | Dep: ${p.dependability}`)
    console.log(`Location: ${p.locationName}`)

    // Inventory summary
    const clothesScore = p.inventory.casualClothesWeeks + p.inventory.dressClothesWeeks + p.inventory.businessClothesWeeks
    console.log(`Food: ${p.inventory.freshFoodUnits} fresh + ${p.inventory.fastFoodCount} fast food | Clothes: ${clothesScore} weeks (${p.inventory.selectedClothes})`)

    // Job info
    if (p.currentJobId && p.currentJobTitle) {
      console.log(`Job: ${p.currentJobTitle} @ ${p.currentJobLocation || p.currentJobId} ($${p.currentJobWage}/h)`)
    }

    // Financial details
    if (p.bankSavings > 0) console.log(`Bank Savings: $${p.bankSavings}`)
    if (p.loanDebt > 0) console.log(`Loan Debt: $${p.loanDebt}`)

    // Education
    const enrolledEntries = Object.entries(p.enrolledClasses)
    if (enrolledEntries.length > 0) {
      for (const [, info] of enrolledEntries) {
        console.log(`📚 Studying: ${info.degreeName} (${info.completed}/${info.required} lessons)`)
      }
    }
    if (p.degrees.length > 0) {
      console.log(`🎓 Degrees: ${p.degrees.join(', ')}`)
    }

    // Goal progress
    console.log(`\n--- GOAL PROGRESS ---`)
    console.log(`  Wealth:    ${p.goalProgress.wealth}/${p.goalAllotment.wealth}`)
    console.log(`  Happiness: ${p.goalProgress.happiness}/${p.goalAllotment.happiness}`)
    console.log(`  Education: ${p.goalProgress.education}/${p.goalAllotment.education}`)
    console.log(`  Career:    ${p.goalProgress.career}/${p.goalAllotment.career}`)

    // Warnings
    for (const warning of p.warnings) {
      console.log(`⚠️  ${warning}`)
    }

    console.log(`======================================================`)
  }

  function showTurnReport(state: GameState, campaign: CampaignBundle) {
    const player = state.players[0]

    console.log(`\n*** WEEK ${state.turn} REPORT ***`)

    if (player.turnEvents && player.turnEvents.length > 0) {
      console.log("\n[Events]")
      player.turnEvents.forEach(evt => {
        const evtName = typeof evt.key === 'string' ? evt.key : JSON.stringify(evt.key)
        const params = evt.params ? ` ${JSON.stringify(evt.params)}` : ''
        console.log(` - ${evtName}${params}`)
      })
    }

    if (player.weekendResult) {
      const eventStr = typeof player.weekendResult.event.key === 'string'
        ? player.weekendResult.event.key
        : JSON.stringify(player.weekendResult.event)
      console.log(`Weekend Activity: ${eventStr} (Cost: $${player.weekendResult.cost})`)
    }

    if (player.newspaperHeadline) {
      const newsStr = typeof player.newspaperHeadline.key === 'string'
        ? player.newspaperHeadline.key
        : JSON.stringify(player.newspaperHeadline)
      console.log(`Headline: ${newsStr}`)
    }

    console.log("")
  }

  function printFinalStats(summary: GameSummary) {
    const p = summary.player
    console.log(`Final stats — Money: $${p.money} | Happiness: ${p.happiness} | Exp: ${p.experience} | Dep: ${p.dependability}`)
    console.log(`Completed in ${summary.turn} weeks.`)
    console.log(`\n--- FINAL GOAL PROGRESS ---`)
    console.log(`  Wealth:    ${p.goalProgress.wealth}/${p.goalAllotment.wealth}`)
    console.log(`  Happiness: ${p.goalProgress.happiness}/${p.goalAllotment.happiness}`)
    console.log(`  Education: ${p.goalProgress.education}/${p.goalAllotment.education}`)
    console.log(`  Career:    ${p.goalProgress.career}/${p.goalAllotment.career}`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
