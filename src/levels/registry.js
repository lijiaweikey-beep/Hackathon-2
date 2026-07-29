import { createLevelRegistry } from "./createLevelRegistry.js";

const discoveredStyles = import.meta.glob("./*/styles.css", {
  eager: true,
  query: "?inline",
  import: "default",
});

const discoveredCovers = import.meta.glob("./*/assets/cover.jpg", {
  eager: true,
  import: "default",
});

const discoveredModules = import.meta.glob("./*/definition.js", {
  eager: true,
  import: "default",
});

const entries = Object.entries(discoveredModules).map(([source, definition]) => {
  const coverSource = source.replace("definition.js", "assets/cover.jpg");
  return [
    source,
    {
      ...definition,
      styleText: discoveredStyles[source.replace("definition.js", "styles.css")] ?? "",
      coverUrl: discoveredCovers[coverSource] ?? "",
    },
  ];
});

export const levelRegistry = createLevelRegistry(entries);
export const LEVELS = levelRegistry.all;
