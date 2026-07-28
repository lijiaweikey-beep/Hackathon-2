import { createResourceScope } from "../core/resourceScope.js";

const REQUIRED_METHODS = ["mount", "start", "update", "dispose"];

function validateExperience(experience, definition) {
  for (const method of REQUIRED_METHODS) {
    if (typeof experience?.[method] !== "function") {
      throw new Error(`关卡体验缺少 ${method}：${definition.id}`);
    }
  }
}

export function createExperienceManager({
  createHost,
  createClassicExperience,
  onError = () => {},
}) {
  let current = null;

  function dispose() {
    if (!current) return;
    const active = current;
    current = null;
    try {
      active.experience.dispose();
    } finally {
      active.scope.dispose();
    }
  }

  function load(definition) {
    dispose();
    const scope = createResourceScope();
    try {
      const host = createHost({ definition, scope });
      const factory = definition.extensions?.createExperience;
      const presentation = factory ? "standalone" : "classic";
      const experience = factory
        ? factory(host)
        : createClassicExperience(definition, host);
      validateExperience(experience, definition);
      current = { definition, experience, presentation, scope };
      return experience;
    } catch (error) {
      scope.dispose();
      onError(error, definition);
      throw error;
    }
  }

  function invoke(method, ...args) {
    if (!current || typeof current.experience[method] !== "function") {
      return undefined;
    }
    try {
      return current.experience[method](...args);
    } catch (error) {
      const definition = current.definition;
      onError(error, definition);
      dispose();
      return undefined;
    }
  }

  return Object.freeze({
    get active() {
      return current?.experience ?? null;
    },
    get activeDefinition() {
      return current?.definition ?? null;
    },
    get presentation() {
      return current?.presentation ?? null;
    },
    load,
    mount: () => invoke("mount"),
    start: () => invoke("start"),
    update: (deltaSeconds) => invoke("update", deltaSeconds),
    updateResult: (deltaSeconds) => invoke("updateResult", deltaSeconds),
    pause: () => invoke("pause"),
    resume: () => invoke("resume"),
    handleInput: (input) => invoke("handleInput", input),
    render: () => invoke("render"),
    getResultStats: () => invoke("getResultStats"),
    showResult(result) {
      if (!current?.experience.showResult) return false;
      invoke("showResult", result);
      return true;
    },
    dispose,
  });
}
