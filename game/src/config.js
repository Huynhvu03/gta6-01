// Solmar: Streets of the Sun — tuning constants and the palette.
// One place for every number the rest of the game shares, so a tweak here
// retunes the whole city without touching the systems that use it.

export const WORLD_SIZE = 3840;
export const ROAD_PITCH = 320;
export const ROAD_WIDTH = 96;
export const LANE = 24;

export const SAVE_KEY = 'solmar-save-v1';
export const START_MONEY = 50;

export const PLAYER_WALK = 178;
export const PLAYER_HEALTH = 100;
export const PLAYER_RADIUS = 14;

export const CAR_ACCEL = 540;
export const CAR_BRAKE = 950;
export const CAR_MAX_SPEED = 470;
export const CAR_REVERSE_MAX = 170;
export const CAR_TURN = 2.5;
export const CAR_RADIUS = 20;

export const TRAFFIC_SPEED = 150;
export const TRAFFIC_COUNT = 26;
export const PARKED_COUNT = 10;
export const PED_COUNT = 42;

export const BULLET_SPEED = 920;
export const BULLET_RANGE = 470;
export const GUN_DAMAGE = 34;
export const GUN_RATE = 0.16;
export const PUNCH_RANGE = 48;
export const PUNCH_DAMAGE = 22;
export const PUNCH_RATE = 0.45;

export const WANTED_MAX = 5;
export const WANTED_DECAY_SECONDS = 25;
export const CRIME_CARJACK = 1;
export const CRIME_KILL_PED = 1;
export const CRIME_KILL_COP = 2;

export const MISSION_REWARDS = [100, 250, 500];
export const PICKUP_CASH = 25;

// Sun-soaked modern coastal city: warm asphalt, pale sidewalks, bright roofs,
// turquoise water and a lot of yellow light.
export const COLORS = {
  ground: '#c9b183',
  asphalt: '#45403c',
  asphaltDark: '#3a3532',
  roadLine: '#e8d44d',
  sidewalk: '#b3a586',
  grass: '#79a854',
  grassDark: '#6b9a4b',
  sand: '#e9cf96',
  water: '#39a3c8',
  waterDeep: '#2b87ab',
  roof: ['#c96f4a', '#d9a05b', '#8fa3b8', '#b8574f', '#e0c184', '#7d8fa3', '#a85f6e', '#5f8a7a'],
  roofEdge: '#00000033',
  buildingSide: '#00000026',
  parkTree: '#4e7d3a',
  parkTreeLight: '#6a9a4e',
  palm: '#3f7d46',
  carBody: ['#d94f3d', '#3d7dd9', '#e8c53a', '#e8e8e8', '#2f2f33', '#7a4fd0', '#3fae7a', '#e07b39'],
  policeBody: '#e8e8e8',
  playerJacket: '#ff7a1a',
  hudPanel: 'rgba(12, 14, 20, 0.72)',
  hudText: '#ffffff',
  hudGold: '#ffd94d',
  marker: '#ffd94d',
  markerGreen: '#59e07a',
  danger: '#ff4d4d',
};

// Key bindings (KeyboardEvent.code values).
export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  enterCar: ['KeyE'],
  punch: ['KeyF'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space'],
  mute: ['KeyM'],
};
