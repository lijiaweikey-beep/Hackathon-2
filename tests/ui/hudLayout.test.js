import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("互动内隐藏任务和目标特征提示条", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const topbarRule = css.match(/\.topbar\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const missionRule = css.match(/\.mission-strip\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const clueWrapRule = css.match(/\.clue-bar-wrap\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(topbarRule, /justify-content:\s*flex-end/);
  assert.match(missionRule, /display:\s*none/);
  assert.match(clueWrapRule, /display:\s*none/);
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

test("隐藏弹窗不拦截互动内按钮", async () => {
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

test("手机横屏短高度历史详情右侧信息不挤入窄列", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.history-detail-body\s*\{[\s\S]*grid-template-columns:\s*38px minmax\(0,\s*1fr\) 38px/);
  assert.match(compactRule, /\.history-detail-share\s*\{[\s\S]*grid-column:\s*2/);
  assert.match(compactRule, /\.history-detail-side\s*\{[\s\S]*grid-column:\s*1 \/ -1/);
  assert.match(compactRule, /\.history-detail-side\s*\{[\s\S]*grid-row:\s*2/);
  assert.match(compactRule, /\.history-detail-side\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(132px,\s*0\.72fr\)/);
  assert.match(compactRule, /\.history-detail-nav\.next\s*\{[\s\S]*grid-column:\s*3/);
});

test("手机横屏短高度事件轴卡片不被底部裁切", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.history-viewport\s*\{[\s\S]*inset:\s*54px 0 48px/);
  assert.match(compactRule, /\.history-node-card\s*\{[\s\S]*height:\s*168px/);
  assert.match(compactRule, /\.history-node-name\s*\{[\s\S]*-webkit-line-clamp:\s*2/);
  assert.match(compactRule, /\.history-node-copy\s*\{[\s\S]*-webkit-line-clamp:\s*1/);
  assert.match(compactRule, /\.history-node-enter\s*\{[\s\S]*white-space:\s*nowrap/);
});

test("关卡主题不覆盖攻击按钮动画和外观", async () => {
  const [gamingCss, officeCss, bloodmoonCss] = await Promise.all([
    readFile(new URL("../../src/levels/gaming/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/levels/office/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/levels/bloodmoon/styles.css", import.meta.url), "utf8"),
  ]);
  const levelCss = [gamingCss, officeCss, bloodmoonCss].join("\n");

  assert.doesNotMatch(levelCss, /\.attack-button\[data-level-theme=/);
  assert.doesNotMatch(levelCss, /tutorial-attack-pulse|tutorial-pulse|tutorial-locked/);
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

test("电脑横屏历史揭晓详情页分享卡不裁切", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const shareRule = css.match(/\.history-detail-share\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const shareCanvasRule = css.match(/\.history-detail-share-canvas\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const desktopLandscapeRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(shareRule, /min-height:\s*0/);
  assert.match(shareCanvasRule, /height:\s*100%/);
  assert.match(shareCanvasRule, /max-height:\s*min\(430px,\s*56vh\)/);
  assert.match(shareCanvasRule, /aspect-ratio:\s*540 \/ 960/);
  assert.match(desktopLandscapeRule, /\.history-detail-panel\s*\{[\s\S]*max-height:\s*calc\(100dvh - 18px\)/);
  assert.match(desktopLandscapeRule, /\.history-detail-panel\s*\{[\s\S]*overflow:\s*hidden/);
});

test("事件轴弹层高于结算弹层避免返回时残影压住", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const modalRule = css.match(/\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const historyRule = css.match(/\.history-timeline-modal\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  const modalZ = Number(modalRule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  const historyZ = Number(historyRule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  assert.ok(historyZ > modalZ);
});
