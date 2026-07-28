import { createResourceScope } from "../core/resourceScope.js";
import { validateLevelDefinition } from "./levelContract.js";

const INSTANCE_METHODS = ["start", "update", "handleAction", "dispose"];

function validateLevelInstance(instance, definition) {
  for (const method of INSTANCE_METHODS) {
    if (typeof instance?.[method] !== "function") {
      throw new Error(`关卡实例缺少 ${method}：${definition.id}`);
    }
  }
}

export function createLevelRunner({ createContext, onError = () => {} }) {
  let active = null;

  function dispose() {
    if (!active) return;
    const current = active;
    active = null;
    try {
      current.instance.dispose();
    } finally {
      current.scope.dispose();
    }
  }

  function fail(error, definition) {
    onError(error, definition);
    dispose();
  }

  return {
    get activeDefinition() {
      return active?.definition ?? null;
    },

    load(definition) {
      validateLevelDefinition(definition, definition?.id);
      dispose();
      const scope = createResourceScope();

      try {
        const context = createContext({ definition, scope });
        const instance = definition.createLevel(context);
        validateLevelInstance(instance, definition);
        active = { definition, instance, scope };
        return instance;
      } catch (error) {
        scope.dispose();
        onError(error, definition);
        throw error;
      }
    },

    start() {
      active?.instance.start();
    },

    update(deltaSeconds) {
      if (!active) return;
      try {
        active.instance.update(deltaSeconds);
      } catch (error) {
        fail(error, active.definition);
      }
    },

    handleAction(action) {
      if (!active) return;
      try {
        active.instance.handleAction(action);
      } catch (error) {
        fail(error, active.definition);
      }
    },

    dispose,
  };
}
