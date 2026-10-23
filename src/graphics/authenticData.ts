/**
 * authenticData.ts — Reverse-engineered spatial and resource data for 1990 Sierra SCI VGA board.
 * Source: script.001.txt, view.751.bmp, view.000.bmp, pic.011.bmp.
 */

export const AUTHENTIC_BOARD_WIDTH = 320;
export const AUTHENTIC_BOARD_HEIGHT = 190;

export interface AuthenticBuildingPlace {
  doorLoop: number;
  doorX: number;
  doorY: number;
  waypointIndex: number;
  waypointX: number;
  waypointY: number;
  hitbox: [number, number, number, number]; // [top, left, bottom, right]
  place: [number, number];                  // [placeX, placeY]
  nodeId: string;
}

export const AUTHENTIC_BUILDINGS: Record<string, AuthenticBuildingPlace> = {
  low_cost_housing: { doorLoop: 0,  doorX: 144, doorY: 30,  waypointIndex: 1,   waypointX: 144, waypointY: 37,  hitbox: [10, 130, 43, 190], place: [134, 2],  nodeId: 'node_low_cost' },
  rent_office:      { doorLoop: 1,  doorX: 105, doorY: 29,  waypointIndex: 164, waypointX: 104, waypointY: 39,  hitbox: [10, 68, 43, 129],  place: [85, 3],   nodeId: 'node_rent' },
  security:         { doorLoop: 2,  doorX: 29,  doorY: 44,  waypointIndex: 151, waypointX: 29,  waypointY: 45,  hitbox: [10, 7, 43, 67],    place: [9, 2],    nodeId: 'node_security' },
  blacks_market:    { doorLoop: 3,  doorX: 46,  doorY: 105, waypointIndex: 134, waypointX: 43,  waypointY: 110, hitbox: [69, 24, 114, 67],  place: [26, 70],  nodeId: 'node_blacks_market' },
  bank:             { doorLoop: 4,  doorX: 20,  doorY: 147, waypointIndex: 120, waypointX: 24,  waypointY: 149, hitbox: [119, 7, 154, 67],  place: [11, 92],  nodeId: 'node_bank' },
  factory:          { doorLoop: 5,  doorX: 50,  doorY: 181, waypointIndex: 107, waypointX: 49,  waypointY: 186, hitbox: [155, 7, 192, 67],  place: [25, 134], nodeId: 'node_factory' },
  employment_office:{ doorLoop: 6,  doorX: 97,  doorY: 183, waypointIndex: 99,  waypointX: 97,  waypointY: 188, hitbox: [168, 68, 192, 128],place: [79, 151], nodeId: 'node_employment' },
  university:       { doorLoop: 7,  doorX: 220, doorY: 179, waypointIndex: 75,  waypointX: 222, waypointY: 188, hitbox: [158, 190, 192, 250],place: [190, 141], nodeId: 'node_university' },
  socket_city:      { doorLoop: 8,  doorX: 277, doorY: 183, waypointIndex: 66,  waypointX: 276, waypointY: 187, hitbox: [133, 251, 192, 311],place: [256, 133], nodeId: 'node_socket' },
  qt_clothing:      { doorLoop: 9,  doorX: 277, doorY: 113, waypointIndex: 47,  waypointX: 276, waypointY: 121, hitbox: [82, 251, 118, 311],place: [257, 80],  nodeId: 'node_qt' },
  burger_palace:    { doorLoop: 10, doorX: 288, doorY: 75,  waypointIndex: 35,  waypointX: 282, waypointY: 81,  hitbox: [44, 251, 81, 311], place: [264, 32],  nodeId: 'node_burger' },
  z_mart:           { doorLoop: 11, doorX: 282, doorY: 34,  waypointIndex: 24,  waypointX: 282, waypointY: 39,  hitbox: [10, 251, 43, 311], place: [258, 2],   nodeId: 'node_z_mart' },
  pawn_shop:        { doorLoop: 12, doorX: 221, doorY: 34,  waypointIndex: 14,  waypointX: 222, waypointY: 40,  hitbox: [10, 191, 43, 250], place: [201, 4],   nodeId: 'node_pawn_shop' },
};

export interface AuthenticOccluder {
  id: string;
  file: string;
  x: number;
  y: number;
}

export const AUTHENTIC_OCCLUDERS: AuthenticOccluder[] = [
  { id: 'roof_patch', file: 'roof_patch.png', x: 68, y: 139 },
  { id: 'bank_roof', file: 'occluders/bank_roof.png', x: 7, y: 119 },
  { id: 'qt_roof', file: 'occluders/qt_roof.png', x: 251, y: 82 },
  { id: 'clock', file: 'occluders/clock.png', x: 147, y: 155 },
];
