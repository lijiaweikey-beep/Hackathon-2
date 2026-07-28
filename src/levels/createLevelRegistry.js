import { validateLevelDefinition } from "./levelContract.js";

export function createLevelRegistry(entries) {
  const byId = new Map();

  for (const [source, definition] of entries) {
    validateLevelDefinition(definition, source);
    if (byId.has(definition.id)) {
      throw new Error(`重复关卡标识：${definition.id}`);
    }
    byId.set(definition.id, definition);
  }

  const all = Object.freeze(
    [...byId.values()].sort((left, right) => left.order - right.order),
  );
  const visible = Object.freeze(all.filter((level) => !level.hidden));
  const mainline = Object.freeze(
    visible
      .filter((level) => level.track === "mainline")
      .sort((left, right) => left.age - right.age || left.order - right.order),
  );
  const extra = Object.freeze(
    visible.filter((level) => level.track !== "mainline"),
  );
  const indexById = new Map(all.map((level, index) => [level.id, index]));

  return Object.freeze({
    all,
    visible,
    mainline,
    extra,
    getById(id) {
      return byId.get(id) ?? null;
    },
    getIndexById(id) {
      return indexById.get(id) ?? -1;
    },
  });
}
