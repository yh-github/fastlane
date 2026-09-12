export interface CurioItem {
  id: string;
  name: string;
}

export const CURIO_CATALOG: CurioItem[] = [
  { id: 'curio_vintage_tin_robot', name: 'Vintage Tin Robot' },
  { id: 'curio_brass_carriage_clock', name: 'Brass Carriage Clock' },
  { id: 'curio_porcelain_teacup', name: 'Antique Porcelain Teacup' },
  { id: 'curio_transistor_radio', name: '1960s Transistor Radio' },
  { id: 'curio_silver_letter_opener', name: 'Silver Letter Opener' },
  { id: 'curio_art_deco_ashtray', name: 'Art Deco Glass Ashtray' },
  { id: 'curio_nautical_compass', name: 'Brass Nautical Compass' },
  { id: 'curio_cast_iron_piggy_bank', name: 'Cast-Iron Mechanical Bank' },
  { id: 'curio_retro_instant_camera', name: 'Retro Instant Camera' },
  { id: 'curio_crystal_prism', name: 'Faceted Crystal Prism' },
  { id: 'curio_carved_chess_knight', name: 'Hand-Carved Chess Knight' },
  { id: 'curio_copper_oil_lamp', name: 'Embossed Copper Oil Lamp' },
  { id: 'curio_opera_glasses', name: 'Mother-of-Pearl Opera Glasses' },
  { id: 'curio_windup_music_box', name: 'Swiss Wind-Up Music Box' },
  { id: 'curio_rotary_desk_calendar', name: 'Brass Rotary Desk Calendar' },
  { id: 'curio_antique_fountain_pen', name: 'Gold-Nib Fountain Pen' },
  { id: 'curio_vintage_stopwatch', name: 'Split-Second Stopwatch' },
  { id: 'curio_leather_bound_journal', name: 'Blank Leather-Bound Journal' },
  { id: 'curio_miniature_globe', name: 'Desk Miniature Globe' },
  { id: 'curio_ceramic_lucky_cat', name: 'Porcelain Maneki-Neko' },
  { id: 'curio_brass_hourglass', name: 'Three-Minute Brass Hourglass' },
  { id: 'curio_ornate_pocketknife', name: 'Engraved Pearl Pocketknife' },
  { id: 'curio_vintage_comic_book', name: 'Dog-Eared Golden Age Comic' },
  { id: 'curio_stereoscope_viewer', name: 'Victorian Stereoscope Viewer' },
  { id: 'curio_retro_alarm_clock', name: 'Wind-Up Twin-Bell Alarm Clock' },
  { id: 'curio_tin_lunchbox', name: 'Embossed 1950s Tin Lunchbox' },
  { id: 'curio_magnifying_glass', name: 'Heavy Brass Magnifying Glass' },
  { id: 'curio_pewter_figurine', name: 'Cast Pewter Dragon Figurine' },
  { id: 'curio_morse_telegraph_key', name: 'Vintage Telegraph Key' },
  { id: 'curio_kaleidoscope', name: 'Stained-Glass Kaleidoscope' }
];

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

