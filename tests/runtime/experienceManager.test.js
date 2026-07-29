import assert from "node:assert/strict";
import test from "node:test";
import { createExperienceManager } from "../../src/runtime/createExperienceManager.js";

function createExperience(calls, name = "experience") {
  return {
    mount: () => calls.push(`${name}:mount`),
    start: () => calls.push(`${name}:start`),
    update: () => calls.push(`${name}:update`),
    dispose: () => calls.push(`${name}:dispose`),
  };
}

test("体验管理器统一委托独立玩法生命周期", () => {
  const calls = [];
  const manager = createExperienceManager({
    createHost: ({ definition }) => ({ definition }),
    createClassicExperience: () => null,
  });
  manager.load({
    id: "standalone",
    extensions: {
      createExperience: () => createExperience(calls),
    },
  });
  assert.equal(manager.presentation, "standalone");

  manager.mount();
  manager.start();
  manager.update(0.016);
  manager.dispose();
  manager.dispose();

  assert.deepEqual(calls, [
    "experience:mount",
    "experience:start",
    "experience:update",
    "experience:dispose",
  ]);
});

test("声明共享布局的独立体验启用共享呈现模式", () => {
  const manager = createExperienceManager({
    createHost: ({ definition }) => ({ definition }),
    createClassicExperience: () => null,
  });

  manager.load({
    id: "shared",
    sharedLayout: true,
    extensions: {
      createExperience: () => createExperience([]),
    },
  });

  assert.equal(manager.presentation, "shared");
});

test("体验管理器在结算等待期委托空闲更新", () => {
  const calls = [];
  const manager = createExperienceManager({
    createHost: ({ definition }) => ({ definition }),
    createClassicExperience: () => ({
      ...createExperience(calls),
      updateIdle: (deltaSeconds) => calls.push(`idle:${deltaSeconds}`),
    }),
  });

  manager.load({ id: "classic", extensions: {} });
  manager.updateIdle(0.016);

  assert.deepEqual(calls, ["idle:0.016"]);
});

test("加载新体验前先销毁旧体验和资源域", () => {
  const calls = [];
  const manager = createExperienceManager({
    createHost({ definition, scope }) {
      scope.add(() => calls.push(`${definition.id}:scope`));
      return { definition };
    },
    createClassicExperience: (definition) =>
      createExperience(calls, definition.id),
  });

  manager.load({ id: "first", extensions: {} });
  manager.load({ id: "second", extensions: {} });

  assert.equal(manager.presentation, "classic");
  assert.deepEqual(calls, ["first:dispose", "first:scope"]);
});

test("体验更新异常会报告错误并清理体验", () => {
  const calls = [];
  const errors = [];
  const manager = createExperienceManager({
    createHost: () => ({}),
    createClassicExperience: () => ({
      ...createExperience(calls),
      update() {
        throw new Error("boom");
      },
    }),
    onError: (error) => errors.push(error.message),
  });
  manager.load({ id: "broken", extensions: {} });

  manager.update(0.016);

  assert.deepEqual(errors, ["boom"]);
  assert.deepEqual(calls, ["experience:dispose"]);
  assert.equal(manager.active, null);
});
