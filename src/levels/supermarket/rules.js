export function createPhotoEvidenceRules({
  requiredPhotos = 4,
  opportunities = 5,
  captureDistance = 7,
} = {}) {
  const state = {
    photos: 0,
    opportunitiesRemaining: opportunities,
    interacting: false,
    obstructed: true,
    distance: Infinity,
    exitOpen: false,
    won: false,
    failed: false,
  };

  function checkFailure() {
    if (state.photos + state.opportunitiesRemaining < requiredPhotos) {
      state.failed = true;
    }
  }

  function setScene({ interacting, obstructed, distance }) {
    state.interacting = Boolean(interacting);
    state.obstructed = Boolean(obstructed);
    state.distance = Number(distance);
  }

  function canCapture() {
    return !state.failed
      && !state.won
      && state.interacting
      && !state.obstructed
      && state.distance <= captureDistance;
  }

  function capture() {
    if (!canCapture()) return { ok: false, photos: state.photos };
    state.photos += 1;
    state.opportunitiesRemaining = Math.max(0, state.opportunitiesRemaining - 1);
    state.interacting = false;
    state.exitOpen = state.photos >= requiredPhotos;
    checkFailure();
    return { ok: true, photos: state.photos, exitOpen: state.exitOpen };
  }

  function missOpportunity() {
    if (state.interacting) state.interacting = false;
    state.opportunitiesRemaining = Math.max(0, state.opportunitiesRemaining - 1);
    checkFailure();
  }

  function reachExit() {
    if (!state.exitOpen || state.failed) return false;
    state.won = true;
    return true;
  }

  return Object.freeze({
    setScene,
    canCapture,
    capture,
    missOpportunity,
    reachExit,
    snapshot: () => ({ ...state }),
  });
}
