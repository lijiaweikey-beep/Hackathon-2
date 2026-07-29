export const FLASHLIGHT_COLOR = 0xfff0c8;
export const FLASHLIGHT_RADIUS = 22;
export const FLASHLIGHT_HEIGHT = 2.8;
export const FLASHLIGHT_SPEED = 1.45;
export const FLASHLIGHT_INTENSITY = 36;
export const FLASHLIGHT_DISTANCE = Math.hypot(FLASHLIGHT_RADIUS, FLASHLIGHT_HEIGHT) + 1.2;
export const FLASHLIGHT_PENUMBRA = 0;
export const FLASHLIGHT_DECAY = 0;
export const FLASHLIGHT_SPOT_ANGLE = Math.atan(FLASHLIGHT_RADIUS / FLASHLIGHT_HEIGHT);

export const TUTORIAL_PHASES = Object.freeze({
  MOVE: "move",
  ATTACK: "attack",
  DONE: "done",
});

export const TUTORIAL_MOVE_HOLD_SECONDS = 0.2;
export const TUTORIAL_FAN_SECONDS = 1.5;
export const TUTORIAL_MISS_HINT_SECONDS = 2.2;
export const TUTORIAL_ATTACK_COOLDOWN = 0.12;

/** 目标电脑位：北侧中央，过道可到达（PLAY_Z_MIN=-5） */
export const TUTORIAL_COMPUTER_INDEX = 6;

export const TUTORIAL_PLAYER_SPAWN = Object.freeze({ x: 0, z: 9.2 });

export const BED_LAYOUT = Object.freeze([
  { x: -10.2, z: -5.2 },
  { x: -10.2, z: 0.6 },
  { x: -10.2, z: 6.3 },
  { x: 10.2, z: -5.2 },
  { x: 10.2, z: 0.6 },
  { x: 10.2, z: 6.3 },
]);
