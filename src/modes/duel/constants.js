import {
  ACTOR_COLLISION_RADIUS,
  HIT_RANGE,
} from "../../config/constants.js";

export const HOST_ROOM_KEY = "nightAction_hostRoom";
export const DUEL_NPC_COUNT = 40;
export const DUEL_PLAYER_HP = 5;
export const DUEL_NPC_HP = 3;
export const NPC_PUNCH_INTERVAL = 10;
export const NPC_PUNCH_RANGE = 1.65;
export const NPC_PUNCH_SWING = 0.42;
export const NPC_PUNCH_DAMAGE = 0.5;
export const HIT_INVULN = 0.55;
export const REMOTE_POS_LERP = 14;
export const REMOTE_SNAP_DIST = 2.2;
export const REMOTE_STALE_MS = 900;
export const DUEL_SPAWN_MIN_DIST = 4.2;
export const DUEL_GATHER_INTERVAL = 90;
export const DUEL_GATHER_PREVIEW = 30;
export const DUEL_GATHER_WINDOW = 5;
export const DUEL_GATHER_RADIUS = 2.2;
export const DUEL_HERD_INTERVAL = 20;
export const DUEL_HERD_DURATION = 2.8;
export const GATHER_COLOR_PREVIEW = 0x15803d;
export const GATHER_COLOR_URGENT = 0xb91c1c;
export const GATHER_COLOR_SUCCESS = 0x14532d;
export const PVP_HIT_RANGE = HIT_RANGE + ACTOR_COLLISION_RADIUS * 2 + 0.25;
export const PROXIMITY_BODY_LEN = ACTOR_COLLISION_RADIUS * 2;
export const PROXIMITY_MIN_DIST = PROXIMITY_BODY_LEN * 2;
export const PROXIMITY_MAX_DIST = PROXIMITY_BODY_LEN * 4;
