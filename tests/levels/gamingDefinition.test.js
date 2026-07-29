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

test("教学摇杆提示在手机横屏短屏中上提", async () => {
  const css = await readFile(
    new URL("../../src/levels/gaming/styles.css", import.meta.url),
    "utf8",
  );

  assert.match(css, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)/);
  assert.match(css, /\.tutorial-joystick-guide/);
});

test("教学摇杆提示在手机横屏短屏中对齐真实摇杆区域", async () => {
  const css = await readFile(
    new URL("../../src/levels/gaming/styles.css", import.meta.url),
    "utf8",
  );
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.tutorial-joystick-guide\s*\{[\s\S]*left:\s*max\(24px/);
  assert.match(compactRule, /\.tutorial-joystick-guide\s*\{[\s\S]*bottom:\s*max\(58px/);
  assert.match(compactRule, /\.tutorial-joystick-guide\s*\{[\s\S]*width:\s*92px/);
  assert.match(compactRule, /\.tutorial-joystick-guide\s*\{[\s\S]*height:\s*92px/);
});
