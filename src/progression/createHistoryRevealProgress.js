function readRevealed(storage, key, knownIds) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((id) => typeof id === "string" && knownIds.has(id)));
  } catch {
    return new Set();
  }
}

function persist(storage, key, revealed) {
  try {
    storage.setItem(key, JSON.stringify([...revealed]));
  } catch {
    // 无存储权限时仍保留本次会话揭晓状态。
  }
}

export function createHistoryRevealProgress({
  levels,
  storage,
  key = "gengge-history-revealed",
  revealFirst = false,
}) {
  const ordered = [...levels];
  const knownIds = new Set(ordered.map(({ id }) => id));
  const revealed = readRevealed(storage, key, knownIds);

  if (revealFirst && ordered[0] && !revealed.has(ordered[0].id)) {
    revealed.add(ordered[0].id);
    persist(storage, key, revealed);
  }

  return Object.freeze({
    isRevealed: (id) => revealed.has(id),
    reveal(id) {
      if (!knownIds.has(id)) return false;
      if (revealed.has(id)) return false;
      revealed.add(id);
      persist(storage, key, revealed);
      return true;
    },
    getRevealedIds: () => ordered
      .filter(({ id }) => revealed.has(id))
      .map(({ id }) => id),
  });
}
