import { createLevelRegistry } from "./createLevelRegistry.js";

const discoveredStyles = import.meta.glob("./*/styles.css", {
  eager: true,
  query: "?inline",
  import: "default",
});

const discoveredModules = import.meta.glob("./*/definition.js", {
  eager: true,
  import: "default",
});

const entries = Object.entries(discoveredModules).map(([source, definition]) => [
  source,
  {
    ...definition,
    styleText: discoveredStyles[source.replace("definition.js", "styles.css")] ?? "",
  },
]);

export const levelRegistry = createLevelRegistry(entries);
export const LEVELS = levelRegistry.all;
