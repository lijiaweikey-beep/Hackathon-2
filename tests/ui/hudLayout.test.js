import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("正式关卡线索条与游戏状态同属顶部状态栏", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const topbar = html.match(/<section class="topbar">([\s\S]*?)<\/section>/)?.[1] ?? "";

  assert.match(topbar, /class="mission-strip"/);
  assert.match(topbar, /class="clue-bar-wrap"/);
  assert.match(topbar, /class="status-strip"/);
  assert.ok(
    topbar.indexOf("clue-bar-wrap") > topbar.indexOf("mission-strip")
      && topbar.indexOf("clue-bar-wrap") < topbar.indexOf("status-strip"),
  );
});

test("难度选择位于事件轴右上角且任务卡不展示人数和玩法说明", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const header = html.match(/<header class="history-header">([\s\S]*?)<\/header>/)?.[1] ?? "";
  const footer = html.match(/<footer class="history-footer">([\s\S]*?)<\/footer>/)?.[1] ?? "";
  const taskModal = html.match(/<section id="taskModal" class="modal">([\s\S]*?)<\/section>/)?.[1] ?? "";

  assert.match(header, /class="difficulty-picker"/);
  assert.doesNotMatch(footer, /class="difficulty-picker"/);
  assert.doesNotMatch(header, /id="difficultyHint"/);
  assert.doesNotMatch(taskModal, /class="match-settings"/);
  assert.doesNotMatch(taskModal, /class="task-controls-guide"/);
});

test("隐藏弹窗不拦截游戏内按钮", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const modalRule = css.match(/\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const visibleRule = css.match(/\.modal\.visible\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(modalRule, /visibility:\s*hidden/);
  assert.match(visibleRule, /visibility:\s*visible/);
});
