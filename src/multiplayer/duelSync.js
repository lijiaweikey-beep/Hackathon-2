import * as THREE from "three";
import { createSeededRng } from "../utils/rng.js";
import {
  DUEL_NPC_COUNT,
  DUEL_NPC_HP,
  DUEL_PLAYER_HP,
  NPC_PUNCH_INTERVAL,
  PVP_HIT_RANGE,
} from "../config/constants.js";

export function buildDuelPuncherSet(worldSeed) {
  const rng = createSeededRng((worldSeed >>> 0) ^ 0x8f4e2c1b);
  const order = Array.from({ length: DUEL_NPC_COUNT }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, Math.floor(DUEL_NPC_COUNT / 2)));
}

export function validatePvpHit(punchData, targetActor) {
  if (!targetActor?.group || targetActor.hp <= 0) return false;
  const playerPos = targetActor.group.position;
  const toTarget = new THREE.Vector2(
    playerPos.x - punchData.x,
    playerPos.z - punchData.z,
  );
  return toTarget.length() <= PVP_HIT_RANGE;
}

export function collectDuelSnapshot(state) {
  const {
    isDuelLevel,
    levelState,
    totalTime,
    getIsHost,
    player,
    remotePlayer,
    npcs,
  } = state;

  if (!isDuelLevel() || !levelState) return null;
  return {
    worldSeed: levelState.worldSeed,
    elapsed: Math.max(0, totalTime - (levelState.startTime || 0)),
    hostHp: getIsHost() ? player.hp : remotePlayer?.hp,
    guestHp: getIsHost() ? remotePlayer?.hp : player.hp,
    duelNpcs: npcs.map((n) => ({
      x: n.group.position.x,
      z: n.group.position.z,
      hp: n.hp ?? DUEL_NPC_HP,
      alive: n.alive,
      punchDelay: n.punchDelay ?? NPC_PUNCH_INTERVAL,
      punchTimer: n.punchTimer ?? 0,
    })),
  };
}

export function buildGameStatePayload(state, extra = {}) {
  const {
    stateRevision,
    gameMode,
    gameStatus,
    currentLevelIndex,
    isDuelActive,
    matchNpcCount,
    duelRoundId,
    levelState,
    isDuelLevel,
    collectSnapshot,
  } = state;

  const payload = {
    revision: stateRevision,
    mode: gameMode,
    phase: gameStatus === "levelSelect"
      ? "lobby"
      : gameStatus === "paused"
        ? "paused"
        : gameStatus === "playing"
          ? "playing"
          : "briefing",
    levelIndex: gameStatus === "levelSelect" ? null : currentLevelIndex,
    npcCount: isDuelActive() ? DUEL_NPC_COUNT : matchNpcCount,
    roundId: duelRoundId,
    started: gameStatus === "playing",
    ...extra,
  };
  if (levelState?.duelSpawns) {
    payload.duelSpawns = levelState.duelSpawns;
  }
  if (extra.includeSnapshot) {
    payload.syncSnapshot = extra.syncSnapshot === true;
    const snap = collectSnapshot();
    if (snap) {
      payload.worldSeed = snap.worldSeed;
      payload.duelNpcs = snap.duelNpcs;
      payload.elapsed = snap.elapsed;
      payload.hostHp = snap.hostHp;
      payload.guestHp = snap.guestHp;
    }
  }
  return payload;
}

export { DUEL_PLAYER_HP };
