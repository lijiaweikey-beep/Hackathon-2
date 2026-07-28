import { createLevelRegistry } from "./createLevelRegistry.js";

import.meta.glob("./*/styles.css", { eager: true });

const discoveredModules = import.meta.glob("./*/definition.js", {
  eager: true,
  import: "default",
});

export const levelRegistry = createLevelRegistry(Object.entries(discoveredModules));
export const LEVELS = levelRegistry.all;
