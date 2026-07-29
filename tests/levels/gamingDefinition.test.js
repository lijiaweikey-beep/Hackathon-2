import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import gamingDefinition from "../../src/levels/gaming/definition.js";

test("凌晨三点关卡使用插件生命周期", () => {
  assert.equal(gamingDefinition.legacy, false);
  assert.equal(typeof gamingDefinition.createLevel, "function");
});

test("凌晨三点关卡提供结算等级插画", () => {
  assert.match(gamingDefinition.art?.cover ?? "", /cover\.jpg/);
  assert.match(gamingDefinition.art?.grades?.S ?? "", /grade-s\.jpg/);
  assert.match(gamingDefinition.art?.grades?.A ?? "", /grade-a\.jpg/);
  assert.match(gamingDefinition.art?.grades?.B ?? "", /grade-b\.jpg/);
  assert.match(gamingDefinition.art?.grades?.C ?? "", /grade-c\.jpg/);
});

test("凌晨三点提示不再引导玩家找声音", async () => {
  const viewSource = await readFile(
    new URL("../../src/levels/gaming/view.js", import.meta.url),
    "utf8",
  );
  const serializedDefinition = JSON.stringify(gamingDefinition);

  assert.doesNotMatch(viewSource, /游戏声/);
  assert.doesNotMatch(serializedDefinition, /游戏声|打游戏|开黑/);
  assert.match(serializedDefinition, /全身发光/);
});

test("凌晨三点不再显示绿色移动引导", async () => {
  const [css, viewSource, createLevelSource] = await Promise.all([
    readFile(new URL("../../src/levels/gaming/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/levels/gaming/view.js", import.meta.url), "utf8"),
    readFile(new URL("../../src/levels/gaming/createLevel.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(css, /tutorial-joystick|tutorial-ring|tutorial-finger|tutorial-guide/);
  assert.doesNotMatch(viewSource, /tutorialJoystickGuide/);
  assert.doesNotMatch(createLevelSource, /placeWaypoint|showMoveTutorial|TUTORIAL_MOVE_HOLD_SECONDS/);
});
