export interface CurioItem {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const CURIO_CATALOG: CurioItem[] = [
  { id: 'curio_vintage_tin_robot', name: 'Vintage Tin Robot', icon: '🤖', description: 'A brightly lithographed tin-plate automaton from the 1950s with clockwork walking gears.' },
  { id: 'curio_brass_carriage_clock', name: 'Brass Carriage Clock', icon: '🕰️', description: 'Heavy beveled glass and polished brass. Ticks with steady, soothing precision.' },
  { id: 'curio_porcelain_teacup', name: 'Antique Porcelain Teacup', icon: '🫖', description: 'Delicate hand-painted bone china with gilt filigree edges.' },
  { id: 'curio_transistor_radio', name: '1960s Transistor Radio', icon: '📻', description: 'Portable mid-century AM receiver in a mint-condition seafoam plastic chassis.' },
  { id: 'curio_silver_letter_opener', name: 'Silver Letter Opener', icon: '🗡️', description: 'Engraved sterling silver dagger with intricate crest on the hilt.' },
  { id: 'curio_art_deco_ashtray', name: 'Art Deco Glass Ashtray', icon: '💎', description: 'Geometric amber-tinted lead crystal capturing sunlight beautifully.' },
  { id: 'curio_nautical_compass', name: 'Brass Nautical Compass', icon: '🧭', description: 'Gimbaled marine compass in a fitted mahogany box, pointing true north.' },
  { id: 'curio_cast_iron_piggy_bank', name: 'Cast-Iron Mechanical Bank', icon: '🐖', description: 'Mechanical coin bank that raises a painted paw when fed a quarter.' },
  { id: 'curio_retro_instant_camera', name: 'Retro Instant Camera', icon: '📷', description: 'Classic folding bellows instant-film camera from the golden age of photography.' },
  { id: 'curio_crystal_prism', name: 'Faceted Crystal Prism', icon: '🔮', description: 'Precision optical glass splitting ambient light into vivid room rainbows.' },
  { id: 'curio_carved_chess_knight', name: 'Hand-Carved Chess Knight', icon: '🐴', description: 'Intricately hand-carved ebony chess piece with soulful expressive eyes.' },
  { id: 'curio_copper_oil_lamp', name: 'Embossed Copper Oil Lamp', icon: '🪔', description: 'Hammered copper lamp with embossed floral motifs from an artisan bazaar.' },
  { id: 'curio_opera_glasses', name: 'Mother-of-Pearl Opera Glasses', icon: '🎭', description: 'Mother-of-pearl miniature binoculars used for balcony theater performances.' },
  { id: 'curio_windup_music_box', name: 'Swiss Wind-Up Music Box', icon: '🎶', description: 'Miniature cylinder mechanism chiming a nostalgic Viennese waltz.' },
  { id: 'curio_rotary_desk_calendar', name: 'Brass Rotary Desk Calendar', icon: '🗓️', description: 'Heavy brass desk calendar with day and month spinning dials.' },
  { id: 'curio_antique_fountain_pen', name: 'Gold-Nib Fountain Pen', icon: '✒️', description: '14-karat gold nib pen with iridescent marbled resin casing.' },
  { id: 'curio_vintage_stopwatch', name: 'Split-Second Stopwatch', icon: '⏱️', description: 'Mechanical split-second racing timer with a crisp mechanical click.' },
  { id: 'curio_leather_bound_journal', name: 'Blank Leather-Bound Journal', icon: '📖', description: 'Supple calfskin journal filled with thick archival parchment paper.' },
  { id: 'curio_miniature_globe', name: 'Desk Miniature Globe', icon: '🌍', description: 'Spun-metal desktop globe charting vintage trade routes and borders.' },
  { id: 'curio_ceramic_lucky_cat', name: 'Porcelain Maneki-Neko', icon: '🐱', description: 'Traditional porcelain Maneki-Neko beckoning fortune and positive vibes.' },
  { id: 'curio_brass_hourglass', name: 'Three-Minute Brass Hourglass', icon: '⏳', description: 'Three-minute sandglass running smooth red garnet sand.' },
  { id: 'curio_ornate_pocketknife', name: 'Engraved Pearl Pocketknife', icon: '🔪', description: 'Handcrafted mother-of-pearl handle with damascus steel blade.' },
  { id: 'curio_vintage_comic_book', name: 'Dog-Eared Golden Age Comic', icon: '🦸', description: 'Golden age superhero comic preserved in an archival protective sleeve.' },
  { id: 'curio_stereoscope_viewer', name: 'Victorian Stereoscope Viewer', icon: '👓', description: 'Victorian handheld stereoscopic viewer bringing 3D photography to life.' },
  { id: 'curio_retro_alarm_clock', name: 'Wind-Up Twin-Bell Alarm Clock', icon: '⏰', description: 'Twin-bell windup clock with glowing phosphorescent numerals.' },
  { id: 'curio_tin_lunchbox', name: 'Embossed 1950s Tin Lunchbox', icon: '🍱', description: 'Embossed space-patrol lunchbox evoking childhood nostalgia.' },
  { id: 'curio_magnifying_glass', name: 'Heavy Brass Magnifying Glass', icon: '🔍', description: 'Heavy dual-magnification reader with a carved rosewood handle.' },
  { id: 'curio_pewter_figurine', name: 'Cast Pewter Dragon Figurine', icon: '🐉', description: 'Hand-cast pewter dragon perched atop a raw amethyst crystal base.' },
  { id: 'curio_morse_telegraph_key', name: 'Vintage Telegraph Key', icon: '⚡', description: 'Heavy brass spring-loaded telegraph sender on an oak base.' },
  { id: 'curio_kaleidoscope', name: 'Stained-Glass Kaleidoscope', icon: '🌈', description: 'Stained-glass brass tube turning beads into infinite hypnotic mandalas.' }
];

export function getCurioDef(catalogId?: string): CurioItem {
  return CURIO_CATALOG.find(c => c.id === catalogId) || CURIO_CATALOG[0];
}

export function ensurePlayerCurios(
  player: { inventory: { curios?: any[]; knickKnacks?: number } },
  currentWeek: number = 1
): any[] {
  if (!player.inventory.curios) {
    player.inventory.curios = [];
  }
  const currentCount = player.inventory.knickKnacks || 0;
  while (player.inventory.curios.length < currentCount) {
    const idx = player.inventory.curios.length % CURIO_CATALOG.length;
    const item = CURIO_CATALOG[idx];
    player.inventory.curios.push({
      id: `${item.id}_${Date.now()}_${player.inventory.curios.length}`,
      catalogId: item.id,
      name: item.name,
      icon: item.icon,
      flavorText: item.description,
      acquiredWeek: Math.max(1, currentWeek)
    });
  }
  // Keep knickKnacks count in sync
  player.inventory.knickKnacks = player.inventory.curios.length;
  return player.inventory.curios;
}

export interface RareTrinketItem {
  id: string;
  name: string;
  basePrice: number;
  description: string;
}

export const RARE_TRINKET_CATALOG: RareTrinketItem[] = [
  { id: 'trinket_lucky_coin', name: 'Engraved Lucky Coin', basePrice: 5, description: 'An old brass good-luck token. Rubbing its worn edge eases the mind.' },
  { id: 'trinket_worry_stone', name: 'Smooth River Worry Stone', basePrice: 6, description: 'Cool to the touch. Fiddling with it relieves anxiety and clears your thoughts.' },
  { id: 'trinket_music_pendant', name: 'Miniature Music Pendant', basePrice: 8, description: 'A delicate pendant that plays a single soothing harmonic chime.' },
  { id: 'trinket_vintage_photo', name: 'Vintage Sepia Portrait', basePrice: 4, description: 'A portrait from a simpler era. Looking at it gives a quiet sense of perspective.' },
  { id: 'trinket_quartz_crystal', name: 'Polished Quartz Crystal', basePrice: 7, description: 'A clear prismatic pebble that sparkles brightly when held to the light.' },
  { id: 'trinket_carved_acorn', name: 'Hand-Carved Wooden Acorn', basePrice: 5, description: 'Smooth polished wood with fine detail, comforting to roll in your palm.' },
  { id: 'trinket_origami_crane', name: 'Laminated Golden Origami Crane', basePrice: 4, description: 'Folded with intricate care. A reminder of patience and resilience.' },
  { id: 'trinket_pressed_flower', name: 'Glass-Framed Pressed Clover', basePrice: 6, description: 'A preserved lucky four-leaf clover glowing softly in an antique brass frame.' }
];

