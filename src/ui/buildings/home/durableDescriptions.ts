import type { GameRules } from '../../../engine/gameState';

export const DEFAULT_APPLIANCE_SPACE: Record<string, number> = {
  refrigerator: 40,
  freezer: 30,
  stove: 40,
  microwave: 20,
  color_tv: 20,
  bw_tv: 20,
  tv: 20,
  stereo: 20,
  '8track': 20,
  vcr: 10,
  computer: 30,
  hot_tub: 50,
  encyclopedia: 20,
  dictionary: 10,
  atlas: 10,
  capote: 10,
  spare_parts: 2,
  knick_knack: 2,
  knick_knacks: 2
};

export function getGameplayDescription(id: string, rules?: GameRules, isBook?: boolean): string {
  if (id === 'wardrobe') {
    return 'Your personal apartment wardrobe. Select which outfit to wear for work and activities, or review clothes durability.';
  }
  if (isBook) {
    const isRefBook = id === 'dictionary' || id === 'encyclopedia' || id === 'atlas';
    const synergyText = 'Part of the 3-book Reference Library (Dictionary, Encyclopedia, Atlas): owning all 3 grants a bonus study credit (-1 lesson required) for university degrees.';

    if (id === 'dictionary') {
      return rules?.usePhysicalMentalConditions
        ? `Language and vocabulary reference. ${synergyText} Continuously increases Max Mental capacity (+1).`
        : `Language and vocabulary reference. ${synergyText}`;
    }
    if (id === 'encyclopedia') {
      return rules?.usePhysicalMentalConditions
        ? `Comprehensive general knowledge reference set. ${synergyText} Continuously increases Max Mental capacity (+1).`
        : `Comprehensive general knowledge reference set. ${synergyText}`;
    }
    if (id === 'atlas') {
      return rules?.usePhysicalMentalConditions
        ? `World maps and geopolitical cartography. ${synergyText} Continuously increases Max Mental capacity (+1).`
        : `World maps and geopolitical cartography. ${synergyText}`;
    }
    if (id === 'capote') {
      return rules?.usePhysicalMentalConditions
        ? 'Literary prose anthology. Continuously increases Max Mental capacity (+1).'
        : 'Literary prose anthology. Reference literature for your home collection.';
    }
    return isRefBook ? synergyText : 'Reference literature for your home apartment.';
  }

  switch (id) {
    case 'refrigerator':
      return 'Prevents fresh grocery spoilage for up to 6 food units at turn end. Without a refrigerator, unpreserved food rots into mess.';
    case 'freezer':
      return 'Expands food preservation capacity from 6 up to 12 units per turn. Requires an active Refrigerator to function; does not prevent spoilage on its own.';
    case 'stove':
      return rules?.usePhysicalMentalConditions
        ? 'Cook hot meals at home. Restores +1 Physical when relaxing.'
        : 'Cook hot meals at home. Awards +1 Happiness every turn.';
    case 'microwave':
      return rules?.usePhysicalMentalConditions
        ? 'Quickly reheat meals. Restores +1 Physical when relaxing and +1 Social when socializing.'
        : 'Quickly reheat meals. Awards +1 Happiness every turn.';
    case 'color_tv':
      return rules?.usePhysicalMentalConditions
        ? 'Color television set. Boosts guest socializing (+2 Social) and enhances apartment lifestyle.'
        : 'Color television set. Living room entertainment for your apartment.';
    case 'bw_tv':
      return rules?.usePhysicalMentalConditions
        ? 'Vintage black-and-white television. Boosts guest socializing (+1 Social) and enables VCR socializing synergy.'
        : 'Vintage black-and-white television. Affordable living room entertainment.';
    case 'vcr':
      return rules?.usePhysicalMentalConditions
        ? 'Home video cassette recorder. Pairs with an active TV (Color or B&W) to boost weekend socializing (+1 Social) and lifestyle.'
        : 'Home video cassette recorder for movie playback.';
    case 'stereo':
    case '8track':
      return rules?.usePhysicalMentalConditions
        ? 'Home audio music player. Boosts guest socializing (+1 Social) and elevates apartment lifestyle.'
        : 'Home audio music player. Plays music throughout your apartment.';
    case 'computer':
      return rules?.usePhysicalMentalConditions
        ? 'Personal microcomputer workstation. Awards a bonus credit when studying for university degrees (-1 lesson required), expands Max Mental (+3), and offers a chance each turn for freelance income ($10–$150).'
        : 'Personal microcomputer workstation. Awards a bonus credit when studying for university degrees (-1 lesson required), plus a chance each turn for freelance income ($10–$150).';
    case 'hot_tub':
      return rules?.usePhysicalMentalConditions
        ? 'Pinnacle home luxury. Prevents relaxation decay from dropping to dangerously low levels, restores condition each turn, and adds major lifestyle prestige.'
        : 'Pinnacle home luxury. Prevents natural relaxation decay from dropping below critical medical illness threshold.';
    case 'spare_parts':
      return rules?.spaceCapping
        ? 'Assorted machine parts from pawn shop rummage bins. Kept in your apartment to boost DIY appliance repair success rates by +20% to +30%. Occupies 2 space per box.'
        : 'Assorted machine parts from pawn shop rummage bins. Kept in your apartment to boost DIY appliance repair success rates by +20% to +30%.';
    case 'knick_knack':
    case 'knick_knacks':
      return rules?.usePhysicalMentalConditions
        ? 'Collectibles salvaged from pawn shop rummage bins. Furnishes aesthetic charm (+2.8 × √Count, max +15) and triggers weekend appraisal events.'
        : 'Collectibles salvaged from pawn shop rummage bins. Unique knick-knacks for your home shelves.';
    default:
      return 'A quality piece of home furnishings that elevates your standard of living and makes your apartment feel like home.';
  }
}
