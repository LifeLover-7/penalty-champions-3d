// src/constants.js - Unified 3D Coordinate System & Game Constants

export const COORDINATES = {
  // Ground plane
  GROUND_Y: 0,

  // Goal on goal line
  GOAL_CENTER: { x: 0, y: 0, z: 0 },
  GOAL_WIDTH: 7.32,   // x from -3.66 to +3.66
  GOAL_HEIGHT: 2.44,  // y from 0 to 2.44
  GOAL_DEPTH: 2.0,    // back net at z = -2.0
  POST_RADIUS: 0.10,

  LEFT_POST_X: -3.66,
  RIGHT_POST_X: 3.66,
  CROSSBAR_Y: 2.44,

  // Goalkeeper
  KEEPER_START: { x: 0, y: 0, z: 0.25 },
  KEEPER_HEIGHT: 1.90,

  // Ball
  BALL_START: { x: 0, y: 0.22, z: 11.0 },
  BALL_RADIUS: 0.22,

  // Camera settings
  STRIKER_CAMERA: {
    position: { x: 0, y: 2.3, z: 15.8 },
    target: { x: 0, y: 1.2, z: 0 }
  },
  GOALKEEPER_CAMERA: {
    position: { x: 0, y: 2.6, z: 15.0 },
    target: { x: 0, y: 1.2, z: 0 }
  }
};

export const PHYSICS = {
  GRAVITY: 9.81,
  AIR_DRAG: 0.12,
  MAGNUS_FACTOR: 0.045,
  MAX_DT: 0.033,
  SUB_STEPS: 3,

  // Swipe bounds & velocities
  MIN_SWIPE_PX: 30,
  VZ_MIN: -16,
  VZ_MAX: -27,
  VY_MIN: 3.5,
  VY_MAX: 8.8,
  VX_MAX: 6.5,
  OMEGA_MAX: 10,

  // Collision limits
  POST_COLLISION_DIST: 0.32, // Ball radius (0.22) + Post radius (0.10)
  GOAL_INNER_X: 3.55,
  GOAL_INNER_Y: 2.34,
  NET_DEPTH_CLAMP: -1.8,
  KEEPER_SAVE_Z_MAX: 0.6,
  KEEPER_SAVE_Z_MIN: -0.1,
  MISS_Z_LIMIT: -2.5
};

export const STATES = {
  MENU: 'MENU',
  PLAYER_AIM: 'PLAYER_AIM',
  BALL_IN_FLIGHT: 'BALL_IN_FLIGHT',
  ROUND_RESULT: 'ROUND_RESULT',
  AI_READY: 'AI_READY',
  AI_SHOT_IN_FLIGHT: 'AI_SHOT_IN_FLIGHT',
  MATCH_OVER: 'MATCH_OVER'
};

// 6 Goal Zones for Goalkeeper Save Turn
export const GOAL_ZONES = [
  { id: 0, name: 'Top-Left',      x: -2.44, y: 1.83, diveX: -2.9, diveY: 1.8,  rollZ: -0.85, high: true  },
  { id: 1, name: 'Top-Center',    x: 0,     y: 1.83, diveX: 0.0,  diveY: 1.6,  rollZ: 0.0,   high: true  },
  { id: 2, name: 'Top-Right',     x: 2.44,  y: 1.83, diveX: 2.9,  diveY: 1.8,  rollZ: 0.85,  high: true  },
  { id: 3, name: 'Bottom-Left',   x: -2.44, y: 0.61, diveX: -2.7, diveY: 0.4,  rollZ: -1.15, high: false },
  { id: 4, name: 'Bottom-Center', x: 0,     y: 0.61, diveX: 0.0,  diveY: 0.35, rollZ: 0.0,   high: false },
  { id: 5, name: 'Bottom-Right',  x: 2.44,  y: 0.61, diveX: 2.7,  diveY: 0.4,  rollZ: 1.15,  high: false }
];
