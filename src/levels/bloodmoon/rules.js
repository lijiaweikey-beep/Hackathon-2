export function isInsideSafeZone(position, zones, radius) {
  return zones.some((zone) => (
    zone && Math.hypot(position.x - zone.x, position.z - zone.z) <= radius
  ));
}

export function getBossHitTransition(mode, bossHp) {
  if (mode === "phase1") {
    return {
      nextMode: "huntIntro",
      nextBossHp: bossHp,
      defeated: false,
    };
  }

  const nextBossHp = Math.max(0, bossHp - 1);
  return {
    nextMode: "phase2",
    nextBossHp,
    defeated: nextBossHp === 0,
  };
}
