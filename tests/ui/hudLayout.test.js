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

test("手机横屏短高度启用紧凑 HUD、任务弹窗和事件轴布局", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.topbar/);
  assert.match(compactRule, /\.task-panel/);
  assert.match(compactRule, /\.history-footer/);
  assert.match(compactRule, /\.tutorial-joystick-guide/);
});

test("操作按钮在手机横屏中保留拇指安全间距", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.controls\s*\{[\s\S]*max\(56px,\s*calc\(env\(safe-area-inset-right\) \+ 44px\)\)/);
  assert.match(compactRule, /\.controls\s*\{[\s\S]*max\(56px,\s*calc\(env\(safe-area-inset-left\) \+ 44px\)\)/);
  assert.match(compactRule, /\.controls\s*\{[\s\S]*max\(58px,\s*calc\(env\(safe-area-inset-bottom\) \+ 52px\)\)/);
});

test("手机横屏短高度顶部 HUD 避开平台角标", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.topbar\s*\{[\s\S]*padding-left:\s*max\(62px,\s*calc\(env\(safe-area-inset-left\) \+ 50px\)\)/);
  assert.match(compactRule, /\.topbar\s*\{[\s\S]*padding-right:\s*max\(58px,\s*calc\(env\(safe-area-inset-right\) \+ 46px\)\)/);
  assert.match(compactRule, /\.topbar\s*\{[\s\S]*padding-top:\s*max\(22px,\s*calc\(env\(safe-area-inset-top\) \+ 16px\)\)/);
});

test("手机横屏短高度把结算页收纳为插画和信息两区", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.result-stage\s*\{[\s\S]*grid-template-columns/);
  assert.match(compactRule, /\.result-art\s*\{[\s\S]*position:\s*relative/);
  assert.match(compactRule, /\.result-art\s*\{[\s\S]*background-size:\s*contain/);
  assert.match(compactRule, /\.result-brief\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(compactRule, /\.share-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 18px\)/);
});

test("电脑横屏结算页与手机横屏使用同一套分区尺寸", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const desktopLandscapeRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(desktopLandscapeRule, /\.result-stage\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(248px,\s*0\.86fr\)/);
  assert.match(desktopLandscapeRule, /\.result-stage\s*\{[\s\S]*--result-stage-width:\s*min\(820px,\s*calc\(100vw - 24px\)\)/);
  assert.match(desktopLandscapeRule, /\.result-stage\s*\{[\s\S]*width:\s*var\(--result-stage-width\)/);
  assert.match(desktopLandscapeRule, /\.result-stage\s*\{[\s\S]*height:\s*min\(calc\(100dvh - 16px\),\s*calc\(var\(--result-stage-width\) \* 390 \/ 844\)\)/);
  assert.match(desktopLandscapeRule, /\.result-art\s*\{[\s\S]*position:\s*relative/);
  assert.match(desktopLandscapeRule, /\.result-art\s*\{[\s\S]*background-size:\s*contain/);
  assert.match(desktopLandscapeRule, /\.result-brief\s*\{[\s\S]*overflow-y:\s*auto/);
  assert.match(desktopLandscapeRule, /\.result-node-title\s*\{[\s\S]*font-size:\s*16px/);
  assert.match(desktopLandscapeRule, /\.result-actions\s+\.primary-button,\n\s*\.result-actions\s+\.secondary-button\s*\{[\s\S]*font-size:\s*13px/);
});

test("电脑横屏历史揭晓详情页不裁切成顶部大图", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const visualRule = css.match(/\.history-detail-visual\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const desktopLandscapeRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(visualRule, /min-height:\s*0/);
  assert.match(desktopLandscapeRule, /\.history-detail-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 18px\)/);
  assert.match(desktopLandscapeRule, /\.history-detail-image\s*\{[\s\S]*position:\s*absolute/);
  assert.match(desktopLandscapeRule, /\.history-detail-image\s*\{[\s\S]*inset:\s*0/);
  assert.match(desktopLandscapeRule, /\.history-detail-image\s*\{[\s\S]*object-fit:\s*contain/);
});

test("事件轴弹层高于结算弹层避免返回时残影压住", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const modalRule = css.match(/\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const historyRule = css.match(/\.history-timeline-modal\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  const modalZ = Number(modalRule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  const historyZ = Number(historyRule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  assert.ok(historyZ > modalZ);
});
