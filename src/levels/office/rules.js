export function createWokRules({
  hp = 3,
  warningSeconds = 0.5,
  hitRadius = 1.2,
  invulnerableSeconds = 0.8,
} = {}) {
  const warnings = [];
  const state = {
    hp,
    invulnerable: 0,
    won: false,
    failed: false,
    bossHit: false,
  };

  function warn(position) {
    const warning = {
      position: { x: position.x, z: position.z },
      remaining: warningSeconds,
    };
    warnings.push(warning);
    return warning;
  }

  function update(deltaSeconds) {
    state.invulnerable = Math.max(0, state.invulnerable - deltaSeconds);
    const ready = [];
    for (let index = warnings.length - 1; index >= 0; index -= 1) {
      warnings[index].remaining -= deltaSeconds;
      if (warnings[index].remaining <= Number.EPSILON * 8) {
        ready.push(warnings[index]);
        warnings.splice(index, 1);
      }
    }
    return { ready: ready.reverse() };
  }

  function land({ position, playerPosition }) {
    const distance = Math.hypot(
      position.x - playerPosition.x,
      position.z - playerPosition.z,
    );
    const playerHit = distance <= hitRadius
      && state.invulnerable <= 0
      && !state.failed;
    if (playerHit) {
      state.hp -= 1;
      state.invulnerable = invulnerableSeconds;
      state.failed = state.hp <= 0;
    }
    return { playerHit, bossHit: false, hp: state.hp };
  }

  function punch(target) {
    if (!target?.isBoss || state.failed) return false;
    state.won = true;
    return true;
  }

  return Object.freeze({
    warn,
    update,
    land,
    punch,
    snapshot: () => ({ ...state, warningCount: warnings.length }),
  });
}
