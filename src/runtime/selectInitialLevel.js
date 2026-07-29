export function selectInitialLevelId(levels, storyProgress) {
  return levels.find(({ id }) => storyProgress?.isUnlocked(id))?.id
    ?? levels[0]?.id
    ?? null;
}
