export function createDebtRules({
  coinGoal = 100,
  coinPerNpc = 20,
  stunSeconds = 2.2,
  pushDistance = 2.4,
} = {}) {
  const state = { coins: 0, won: false, failed: false };

  function hit(npc) {
    if (!npc || npc.flattened || state.won || state.failed) return false;
    npc.stunRemaining = stunSeconds;
    return true;
  }

  function push(npc, direction) {
    if (!npc || npc.flattened || (npc.stunRemaining ?? 0) <= 0) return false;
    const length = Math.hypot(direction.x, direction.z);
    if (!length) return false;
    npc.x += (direction.x / length) * pushDistance;
    npc.z += (direction.z / length) * pushDistance;
    return true;
  }

  function smash(zone, npcs, playerPosition) {
    const inside = (position) =>
      Math.hypot(position.x - zone.x, position.z - zone.z) <= zone.radius;
    const crushed = [];
    for (const npc of npcs) {
      if (!npc.flattened && inside(npc)) {
        npc.flattened = true;
        crushed.push(npc);
      }
    }
    const coinsGained = crushed.length * coinPerNpc;
    state.coins = Math.min(coinGoal, state.coins + coinsGained);
    state.won ||= state.coins >= coinGoal;
    const playerHit = Boolean(playerPosition && inside(playerPosition));
    state.failed ||= playerHit;
    return { coinsGained, crushed, playerHit };
  }

  function update(deltaSeconds, npcs) {
    npcs.forEach((npc) => {
      npc.stunRemaining = Math.max(0, (npc.stunRemaining || 0) - deltaSeconds);
    });
  }

  return Object.freeze({
    hit,
    push,
    smash,
    update,
    snapshot: () => ({ ...state }),
  });
}
