import assert from "node:assert/strict";
import test from "node:test";
import definition from "../fixtures/sample-level/definition.js";
import { validateLevelDefinition } from "../../src/levels/levelContract.js";

test("样例关卡仅依赖公开契约即可通过校验", () => {
  assert.equal(validateLevelDefinition(definition, "sample"), definition);
  assert.equal(definition.hidden, true);
  assert.deepEqual(definition.actions, ["findHitTarget"]);
});
