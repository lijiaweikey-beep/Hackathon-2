function readCompleted(storage, key, knownIds) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(value)) return new Set();
    return new Set(value.filter((id) => typeof id === "string" && knownIds.has(id)));
  } catch {
    return new Set();
  }
}

export function createStoryProgress({
  levels,
  storage,
  key = "gengge-story-progress",
  unlockAll = false,
}) {
  const ordered = [...levels];
  const knownIds = new Set(ordered.map(({ id }) => id));
  const completed = readCompleted(storage, key, knownIds);

  return Object.freeze({
    isCompleted: (id) => completed.has(id),
    isComplete: () => ordered.length > 0
      && ordered.every(({ id }) => completed.has(id)),
    isUnlocked(id) {
      if (!knownIds.has(id)) return false;
      if (unlockAll) return true;
      const index = ordered.findIndex((level) => level.id === id);
      return index === 0
        || (index > 0 && (completed.has(id) || completed.has(ordered[index - 1].id)));
    },
    complete(id) {
      if (!knownIds.has(id)) return false;
      completed.add(id);
      try {
        storage.setItem(key, JSON.stringify([...completed]));
      } catch {
        // 无存储权限时仍保留本次会话进度。
      }
      return true;
    },
    getCompletedIds: () => ordered
      .filter(({ id }) => completed.has(id))
      .map(({ id }) => id),
  });
}
