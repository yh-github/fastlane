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
    case 'apply_job':
    case 'work':
    case 'bank_deposit':
    case 'bank_withdraw':
    case 'bank_loan':
    case 'bank_repay':
    case 'charity':
    case 'rent_pay':
    case 'doctor_heal':
    case 'study':
      // These actions happen inside buildings. 
      // Open the building modal visually so the human sees the AI at the location.
      ui.setIsBuildingModalOpen(true);
      
      // Pause to let the human process that the AI is looking at the store/office
      await new Promise(r => setTimeout(r, PACING_DELAY_MS));
      
      // Optionally in the future: we could dispatch a temporary "highlight" state 
      // to the specific button (e.g. highlight the specific item being bought)
      // before waiting another few MS and returning.
      
      break;

    case 'eat':
    case 'relax':
    case 'change_clothes':
      // Inventory actions
      // Could open inventory modal here in the future.
      await new Promise(r => setTimeout(r, PACING_DELAY_MS));
      break;

    case 'end-turn':
      ui.setIsBuildingModalOpen(false);
      break;

    default:
      await new Promise(r => setTimeout(r, PACING_DELAY_MS / 2));
      break;
  }
}
