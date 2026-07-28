export const DEFAULT_NPC_COUNT = 20;
export const MIN_NPC_COUNT = 10;
export const MAX_NPC_COUNT = 100;
export const NPC_COUNT_STORAGE_KEY = "nightAction_npcCount";
export const BEST_SCORE_STORAGE_KEY = "nightAction_best";

export const WORLD_LIMIT = 10.8;
export const PLAY_Z_MIN = -5.0;
export const HIT_RANGE = 1.85;
export const HIT_PAIR_RANGE = 2.15;
export const HIT_FACING_DOT = 0.12;
export const PLAYER_SPEED = 3;
export const NPC_SPEED = 3;
export const ROUND_SECONDS = 90;
export const ATTEMPTS = 3;

export const PUNCH_SWING = 0.32;
export const PLAYER_LERP = 0.88;
export const ACTION_INTERVAL_MS = 500;
export const REVERSE_INPUT_LOCK_MS = 500;
export const REVERSE_INPUT_DOT_THRESHOLD = -0.35;

export const TEMPLE_MOON_RADIUS = 4.55;
export const TEMPLE_SHADOW_FADE = 0.55;
export const TEMPLE_DECOY_SHADOW_STYLES = ["fan", "moon", "window", "stone", "leaf", "willow"];
export const TEMPLE_TRUE_SHADOW_MAX = 0.68;
export const TEMPLE_TRUE_REVEAL_AT = 0.75;
export const TEMPLE_TRUE_INITIAL_MOON_DELAY = [12, 16];
export const SU_SHI_SHADOW_PATTERN = [
  { x: -0.58, z: -0.08, length: 1.9, width: 0.12, rz: -0.72, opacity: 0.38, accent: false },
  { x: -0.34, z: 0.22, length: 1.55, width: 0.1, rz: -0.28, opacity: 0.33, accent: false },
  { x: 0.18, z: -0.16, length: 1.7, width: 0.1, rz: 0.42, opacity: 0.36, accent: false },
  { x: 0.48, z: 0.18, length: 1.35, width: 0.09, rz: 0.88, opacity: 0.31, accent: false },
  { x: -0.1, z: 0.0, length: 1.25, width: 0.08, rz: 1.36, opacity: 0.28, accent: false },
  { x: 0.05, z: 0.32, length: 0.92, width: 0.075, rz: -1.25, opacity: 0.27, accent: false },
  { x: -0.44, z: -0.32, length: 0.98, width: 0.075, rz: 1.08, opacity: 0.27, accent: false },
  { x: -0.02, z: 0.02, length: 1.05, width: 0.055, rz: -0.72, opacity: 0.28, accent: true },
  { x: 0.04, z: 0.0, length: 0.92, width: 0.055, rz: 0.74, opacity: 0.24, accent: true },
];

export const ACTOR_COLLISION_RADIUS = 0.38;

export const BLOODMOON_SANITY_MAX = 100;
export const BLOODMOON_WOLF_COOLDOWN = 0.28;
export const BLOODMOON_NPC_HIT_RANGE = 1.45;
export const BLOODMOON_NPC_HIT_DAMAGE = 18;
export const BLOODMOON_LIGHTNING_INTERVAL = [2.6, 4.2];
export const BLOODMOON_CLUE_SECONDS = 1.35;
export const BLOODMOON_DECOY_CUES = 3;
export const BLOODMOON_HUNT_SECONDS = 20;
export const BLOODMOON_PHASE2_HP_MAX = 3;
export const BLOODMOON_SUMMON_COUNT = 10;
export const BLOODMOON_SAFE_ZONE_COUNT = 3;
export const BLOODMOON_GUARD_SPEED = 2.0;
export const BLOODMOON_GUARD_DAMAGE = 24;
export const BLOODMOON_HUNT_INTRO_SECONDS = 2.8;

export const PUNCH_COOLDOWNS = [2.0, 4.0, 6.0];
export const PUNCH_RESET_DELAY = 2.0;

export const GRID_CELL = 2.0;

export const CAMERA_BASE_POS = { x: 0, y: 19.5, z: 17.2 };
