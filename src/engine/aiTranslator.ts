import { type GameAction } from './gameReducer';

export interface TranslatorUIHooks {
  setIsBuildingModalOpen: (val: boolean) => void;
  // Can add more hooks here in the future for inventory, newspaper, etc.
}

/**
 * Paces the AI's actions by hooking into the React UI state.
 * Allows the human observer to see the AI "thinking" and navigating the GUI
 * before the action is executed under the hood.
 */
export async function simulateActionVisuals(action: GameAction, ui: TranslatorUIHooks): Promise<void> {
  const PACING_DELAY_MS = 600;

  switch (action.type) {
    case 'move':
      // Move actions already have robust pathfinding animations in mapRenderer.ts
      // No extra UI manipulation needed here.
      break;

    case 'buy':
    case 'apply':
    case 'work':
    case 'bank_transaction':
    case 'take_loan':
    case 'pay_loan':
    case 'rent_transaction':
    case 'pay_rent_advance':
    case 'enroll':
    case 'study':
    case 'pawn_item':
    case 'redeem_item':
    case 'buy_pawn_item':
      // These actions happen inside buildings. 
      // Open the building modal visually so the human sees the AI at the location.
      ui.setIsBuildingModalOpen(true);
      
      // Pause to let the human process that the AI is looking at the store/office
      await new Promise(r => setTimeout(r, PACING_DELAY_MS));
      
      // Dispatch visual highlight
      let selector = '';
      if (action.type === 'apply') selector = `[data-action-target="apply-${action.jobId}"]`;
      else if (action.type === 'work') selector = `[data-action-target="work-${action.jobId}"]`;
      else if (action.type === 'buy') selector = `[data-action-target="buy-${action.itemId}"]`;
      else if (action.type === 'study') selector = `[data-action-target="study-${action.degreeId}"]`;
      else if (action.type === 'enroll') selector = `[data-action-target="enroll-${action.degreeId}"]`;

      if (selector) {
        const el = document.querySelector(selector);
        if (el) {
          el.classList.add('ai-simulated-click');
          await new Promise(r => setTimeout(r, 400));
          el.classList.remove('ai-simulated-click');
        }
      }
      break;

    case 'eat':
    case 'relax':
    case 'change_clothes':
      // Inventory actions
      if (action.type === 'relax') {
        ui.setIsBuildingModalOpen(true);
        await new Promise(r => setTimeout(r, PACING_DELAY_MS));
        const el = document.querySelector('[data-action-target="relax"]');
        if (el) {
          el.classList.add('ai-simulated-click');
          await new Promise(r => setTimeout(r, 400));
          el.classList.remove('ai-simulated-click');
        }
      } else {
        await new Promise(r => setTimeout(r, PACING_DELAY_MS));
      }
      break;

    case 'end-turn':
      ui.setIsBuildingModalOpen(false);
      break;

    default:
      await new Promise(r => setTimeout(r, PACING_DELAY_MS / 2));
      break;
  }
}
