export const LEVEL_ACTIONS = Object.freeze([
  "actorDissolved",
  "afterNpcUpdate",
  "attackMiss",
  "beforeAttack",
  "beginPlay",
  "beginSpecialPhase",
  "configureDecoy",
  "findHitTarget",
  "getHudState",
  "getResultStats",
  "hitTarget",
  "updateDecoy",
]);

const levelActionSet = new Set(LEVEL_ACTIONS);

export function isLevelAction(type) {
  return levelActionSet.has(type);
}
