import test from "node:test";
import assert from "node:assert/strict";
import { createLevelRunner } from "../../src/levels/levelRunner.js";

function createDefinition(id, calls) {
  return {
    id,
    sceneName: id,
    order: 1,
    createLevel({ scope }) {
      scope.add(() => calls.push(`${id}:resource`));
      return {
        start: () => calls.push(`${id}:start`),
        update: () => {},
        handleAction: () => {},
        dispose: () => calls.push(`${id}:dispose`),
      };
    },
  };
}

test("加载新关卡前先销毁旧关卡及其资源", () => {
  const calls = [];
  const runner = createLevelRunner({
    createContext: ({ scope }) => ({ scope }),
  });

  runner.load(createDefinition("first", calls));
  runner.start();
  runner.load(createDefinition("second", calls));

  assert.deepEqual(calls, ["first:start", "first:dispose", "first:resource"]);
});

test("重复销毁不会重复清理关卡", () => {
  const calls = [];
  const runner = createLevelRunner({
    createContext: ({ scope }) => ({ scope }),
  });

  runner.load(createDefinition("only", calls));
  runner.dispose();
  runner.dispose();

  assert.deepEqual(calls, ["only:dispose", "only:resource"]);
});

test("关卡更新异常会报告错误并销毁关卡", () => {
  const errors = [];
  const runner = createLevelRunner({
    createContext: ({ scope }) => ({ scope }),
    onError: (error, definition) => errors.push([error.message, definition.id]),
  });
  const definition = createDefinition("broken", []);
  definition.createLevel = () => ({
    start() {},
    update() { throw new Error("更新失败"); },
    handleAction() {},
    dispose() {},
  });

  runner.load(definition);
  runner.update(0.016);

  assert.deepEqual(errors, [["更新失败", "broken"]]);
  assert.equal(runner.activeDefinition, null);
});
