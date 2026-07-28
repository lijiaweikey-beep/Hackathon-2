import assert from "node:assert/strict";
import test from "node:test";
import definition from "../fixtures/sample-level/definition.js";
import { createNpc } from "../fixtures/sample-level/actors.js";
import { validateLevelDefinition } from "../../src/levels/levelContract.js";

test("样例关卡仅依赖公开契约即可通过校验", () => {
  assert.equal(validateLevelDefinition(definition, "sample"), definition);
  assert.equal(definition.hidden, true);
  assert.deepEqual(definition.actions, ["beginPlay", "findHitTarget"]);
  const target = { id: 1 };
  const level = definition.createLevel({
    actors: {
      createNpc: () => target,
      addNpc: () => {},
    },
    combat: {
      isFacingTarget: (candidate) => candidate === target,
    },
    ui: {
      showOverlay: () => {},
      hideOverlay: () => {},
    },
  });
  level.start();
  assert.equal(level.handleAction({ type: "findHitTarget" }), target);
  assert.equal(typeof level.dispose, "function");
  assert.equal(createNpc(2, { levelTarget: true }).id, 2);
  level.dispose();
});
