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
  hitbox: [number, number, number, number]; // [top, left, bottom, right]
  place: [number, number];                  // [placeX, placeY]
  nodeId: string;
}

export const AUTHENTIC_BUILDINGS: Record<string, AuthenticBuildingPlace> = {
  low_cost_housing: { doorLoop: 0,  doorX: 144, doorY: 30,  hitbox: [10, 130, 43, 190], place: [134, 2],  nodeId: 'node_low_cost' },
  rent_office:      { doorLoop: 1,  doorX: 105, doorY: 29,  hitbox: [10, 68, 43, 129],  place: [85, 3],   nodeId: 'node_rent' },
  security:         { doorLoop: 2,  doorX: 29,  doorY: 44,  hitbox: [10, 7, 43, 67],    place: [9, 2],    nodeId: 'node_security' },
  blacks_market:    { doorLoop: 3,  doorX: 46,  doorY: 105, hitbox: [69, 24, 114, 67],  place: [26, 70],  nodeId: 'node_blacks_market' },
  bank:             { doorLoop: 4,  doorX: 20,  doorY: 147, hitbox: [119, 7, 154, 67],  place: [11, 92],  nodeId: 'node_bank' },
  factory:          { doorLoop: 5,  doorX: 50,  doorY: 181, hitbox: [155, 7, 192, 67],  place: [25, 134], nodeId: 'node_factory' },
  employment_office:{ doorLoop: 6,  doorX: 97,  doorY: 183, hitbox: [168, 68, 192, 128],place: [79, 151], nodeId: 'node_employment' },
  university:       { doorLoop: 7,  doorX: 220, doorY: 179, hitbox: [158, 190, 192, 250],place: [190, 141], nodeId: 'node_university' },
  socket_city:      { doorLoop: 8,  doorX: 277, doorY: 183, hitbox: [133, 251, 192, 311],place: [256, 133], nodeId: 'node_socket' },
  qt_clothing:      { doorLoop: 9,  doorX: 277, doorY: 113, hitbox: [82, 251, 118, 311],place: [257, 80],  nodeId: 'node_qt' },
  burger_palace:    { doorLoop: 10, doorX: 288, doorY: 75,  hitbox: [44, 251, 81, 311], place: [264, 32],  nodeId: 'node_burger' },
  z_mart:           { doorLoop: 11, doorX: 282, doorY: 34,  hitbox: [10, 251, 43, 311], place: [258, 2],   nodeId: 'node_z_mart' },
  pawn_shop:        { doorLoop: 12, doorX: 221, doorY: 34,  hitbox: [10, 191, 43, 250], place: [201, 4],   nodeId: 'node_pawn_shop' },
};
