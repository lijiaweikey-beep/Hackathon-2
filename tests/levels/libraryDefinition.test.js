import test from "node:test";
import assert from "node:assert/strict";
import libraryDefinition from "../../src/levels/library/definition.js";

test("图书馆关卡使用插件生命周期", () => {
  assert.equal(libraryDefinition.legacy, false);
  assert.equal(typeof libraryDefinition.createLevel, "function");
});
