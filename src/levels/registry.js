import { createLevelRegistry } from "./createLevelRegistry.js";

const discoveredModules = import.meta.glob("./*/definition.js", {
  eager: true,
  import: "default",
});

export const levelRegistry = createLevelRegistry(Object.entries(discoveredModules));
export const LEVELS = levelRegistry.all;

export function getDuelLevelIndex() {
  return LEVELS.findIndex((level) => level.duelMode);
}

export function isDuelLevel(level) {
  return Boolean(level?.duelMode);
}
