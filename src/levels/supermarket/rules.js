import { getFacingVector } from "../../utils/math.js";

function horizontalDirection(from, to) {
  const x = to.x - from.x;
  const z = to.z - from.z;
  const distance = Math.hypot(x, z);
  return {
    distance,
    x: distance > 0 ? x / distance : 0,
    z: distance > 0 ? z / distance : 0,
  };
}

export function evaluatePhotoScene({
  player,
  couple,
  isLineBlocked,
  frameDot = 0.72,
}) {
  const playerPosition = player.group.position;
  const facing = getFacingVector(player.group.rotation.y);
  let framedTargets = 0;
  let obstructed = false;
  let distance = 0;

  couple.forEach(({ group }) => {
    const direction = horizontalDirection(playerPosition, group.position);
    distance = Math.max(distance, direction.distance);
    if (facing.x * direction.x + facing.y * direction.z >= frameDot) {
      framedTargets += 1;
    }
    if (isLineBlocked(playerPosition, group.position)) obstructed = true;
  });

  return { framedTargets, obstructed, distance };
}

export function createPhotoEvidenceRules({
  requiredPhotos = 4,
  opportunities = 5,
  captureDistance = 7,
} = {}) {
  const state = {
    photos: 0,
    opportunitiesRemaining: opportunities,
    eventId: null,
    interacting: false,
    obstructed: true,
    distance: Infinity,
    framedTargets: 0,
    won: false,
    failed: false,
  };
  const capturedEvents = new Set();

  function checkFailure() {
    if (state.photos + state.opportunitiesRemaining < requiredPhotos) {
      state.failed = true;
    }
  }

  function setScene({
    eventId = null,
    interacting,
    obstructed,
    distance,
    framedTargets = 0,
  }) {
    state.eventId = eventId;
    state.interacting = Boolean(interacting);
    state.obstructed = Boolean(obstructed);
    state.distance = Number(distance);
    state.framedTargets = Number(framedTargets);
  }

  function captureFailureReason() {
    if (state.failed) return "取证机会已经不足";
    if (state.won) return "取证已经完成";
    if (!state.interacting || state.eventId == null) return "等待目标开始互动";
    if (capturedEvents.has(state.eventId)) return "这次互动已经拍过";
    if (state.framedTargets < 2) return "让两名目标都进入取景框";
    if (state.obstructed) return "视线被货架或柜台遮挡";
    if (state.distance > captureDistance) return "距离太远，请再靠近一些";
    return null;
  }

  function canCapture() {
    return captureFailureReason() === null;
  }

  function capture() {
    const reason = captureFailureReason();
    if (reason) return { ok: false, photos: state.photos, reason };
    capturedEvents.add(state.eventId);
    state.photos += 1;
    state.opportunitiesRemaining = Math.max(0, state.opportunitiesRemaining - 1);
    state.interacting = false;
    state.won = state.photos >= requiredPhotos;
    checkFailure();
    return { ok: true, photos: state.photos, won: state.won };
  }

  function missOpportunity() {
    if (state.interacting) state.interacting = false;
    state.opportunitiesRemaining = Math.max(0, state.opportunitiesRemaining - 1);
    checkFailure();
  }

  return Object.freeze({
    setScene,
    canCapture,
    capture,
    missOpportunity,
    snapshot: () => ({ ...state }),
  });
}
