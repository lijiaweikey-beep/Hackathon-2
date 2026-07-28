import assert from "node:assert/strict";
import test from "node:test";
import definition from "../fixtures/standalone-level/definition.js";
import { validateLevelDefinition } from "../../src/levels/levelContract.js";

test("独立玩法样例只通过体验宿主完成完整生命周期", () => {
  const calls = [];
  const counter = { textContent: "" };
  const host = {
    surface: {
      root: {
        querySelector: () => counter,
      },
      setContent: (html) => calls.push(["content", html]),
      clear: () => calls.push(["clear"]),
    },
    input: {
      listen: (...args) => calls.push(["listen", ...args]),
      windowTarget: {},
    },
    flow: {
      finish: (result) => calls.push(["finish", result]),
      leave: () => calls.push(["leave"]),
    },
  };
  const experience = definition.extensions.createExperience(host);

  experience.mount();
  experience.start();
  experience.update(0.5);
  experience.pause();
  experience.resume();
  experience.handleInput({ type: "primary" });
  experience.handleInput({ type: "primary" });
  experience.handleInput({ type: "primary" });
  experience.showResult({ won: true });
  experience.dispose();

  assert.equal(validateLevelDefinition(definition), definition);
  assert.equal(definition.createLevel, undefined);
  assert.equal(experience.presentation, "standalone");
  assert.equal(calls.filter(([name]) => name === "finish").length, 1);
  assert.equal(calls.at(-1)[0], "clear");
});
