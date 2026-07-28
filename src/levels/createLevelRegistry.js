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

  return Object.freeze({
    all,
    visible,
    getById(id) {
      return byId.get(id) ?? null;
    },
  });
}
