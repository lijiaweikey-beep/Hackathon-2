import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("互动内隐藏左上角任务卡并保留目标提示条", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const topbarRule = css.match(/\.topbar\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const missionRule = css.match(/\.mission-strip\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const clueWrapRule = css.match(/\.clue-bar-wrap\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(topbarRule, /justify-content:\s*flex-end/);
  assert.match(missionRule, /display:\s*none/);
  assert.match(clueWrapRule, /position:\s*fixed/);
  assert.match(clueWrapRule, /inset:\s*0/);
});

test("难度与设置按钮位于事件轴右上角，设置内含音效音乐震动", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const header = html.match(/<header class="history-header">([\s\S]*?)<\/header>/)?.[1] ?? "";
  const footer = html.match(/<footer class="history-footer">([\s\S]*?)<\/footer>/)?.[1] ?? "";
  const taskModal = html.match(/<section id="taskModal" class="modal">([\s\S]*?)<\/section>/)?.[1] ?? "";
  const settingsPanel = html.match(/<div id="settingsPanel"[\s\S]*?<\/div>\s*<div id="historyViewport"/)?.[0] ?? "";

  assert.match(header, /class="difficulty-picker"/);
  assert.match(header, /id="settingsButton"/);
  assert.doesNotMatch(header, /data-pref="sfx"/);
  assert.match(html, /id="settingsPanel"/);
  assert.match(html, /data-pref="sfx"/);
  assert.match(html, /data-pref="music"/);
  assert.match(html, /data-pref="vibration"/);
  assert.match(html, /class="settings-panel-list"/);
  assert.doesNotMatch(footer, /class="difficulty-picker"/);
  assert.doesNotMatch(header, /id="difficultyHint"/);
  assert.doesNotMatch(taskModal, /class="match-settings"/);
  assert.doesNotMatch(taskModal, /class="task-controls-guide"/);
  assert.ok(settingsPanel.includes("settings-panel-list"));
});

test("浏览器标签页使用新游戏名", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");

  assert.match(html, /<title>别让我逮到你!!<\/title>/);
});

test("下一关解锁复用封印揭晓动画", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const revealingRule = css.match(/\.history-node-card\.revealing\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const keyframes = css.match(/@keyframes\s+historyCardReveal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(revealingRule, /historyCardReveal/);
  assert.match(keyframes, /rotateY\(180deg\)/);
  assert.doesNotMatch(css, /\.history-node-card\.unlocking/);
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
  assert.match(compactRule, /\.clue-bar\s*\{/);
  assert.match(compactRule, /font-size:\s*clamp\(16px,\s*2\.6vw,\s*22px\)/);
  assert.match(compactRule, /\.clue-bar\.floated\s*\{/);
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

test("左侧摇杆扩大触摸热区时保持原视觉位置", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const joystickRule = css.match(/\.joystick-hit-area\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const shortRule = css.match(
    /@media\s*\(max-height:\s*480px\)\s*\{([\s\S]*?)\.attack-button/,
  )?.[1] ?? "";
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(joystickRule, /--joystick-size:\s*118px/);
  assert.match(joystickRule, /--joystick-hit-size:\s*177px/);
  assert.match(joystickRule, /--joystick-hit-margin:\s*-29\.5px/);
  assert.match(joystickRule, /margin:\s*var\(--joystick-hit-margin\)/);
  assert.match(joystickRule, /width:\s*var\(--joystick-hit-size\)/);
  assert.match(joystickRule, /height:\s*var\(--joystick-hit-size\)/);
  assert.match(css, /\.joystick\s*\{[\s\S]*width:\s*var\(--joystick-size\)/);
  assert.match(css, /\.joystick\s*\{[\s\S]*height:\s*var\(--joystick-size\)/);
  assert.match(shortRule, /\.joystick-hit-area\s*\{[\s\S]*--joystick-size:\s*108px/);
  assert.match(shortRule, /\.joystick-hit-area\s*\{[\s\S]*--joystick-hit-size:\s*162px/);
  assert.match(shortRule, /\.joystick-hit-area\s*\{[\s\S]*--joystick-hit-margin:\s*-27px/);
  assert.match(compactRule, /\.joystick-hit-area\s*\{[\s\S]*--joystick-size:\s*92px/);
  assert.match(compactRule, /\.joystick-hit-area\s*\{[\s\S]*--joystick-hit-size:\s*138px/);
  assert.match(compactRule, /\.joystick-hit-area\s*\{[\s\S]*--joystick-hit-margin:\s*-23px/);
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

test("手机横屏短高度历史详情复用结算卡架构", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const compactRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*520px\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(compactRule, /\.history-detail-stage\s*\{[\s\S]*--result-stage-width/);
  assert.match(compactRule, /\.history-detail-stage\s*\{[\s\S]*max-height:\s*calc\(100dvh - 16px\)/);
  assert.match(compactRule, /\.history-detail-nav\s*\{[\s\S]*width:\s*34px/);
  assert.match(compactRule, /\.history-detail-stage\s+\.result-unlock\s*\{[\s\S]*display:\s*none/);
});

test("历史详情与结算页共用 result-stage 架构", async () => {
  const html = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");

  assert.match(html, /id="historyDetailPanel"\s+class="result-stage history-detail-stage"/);
  assert.match(html, /id="historyDetailArt"\s+class="result-art/);
  assert.match(html, /class="result-slug"/);
  assert.match(html, /id="historyDetailRating"\s+class="result-rating"/);
  assert.match(html, /class="result-brief"/);
  assert.match(html, /id="historyDetailStats"\s+class="result-stats"/);
  assert.match(html, /class="result-actions"/);

  assert.match(css, /\.history-detail-frame\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0,\s*1fr\) auto/);
  assert.match(css, /\.history-detail-stage\s*\{[\s\S]*grid-column:\s*2/);
  assert.doesNotMatch(css, /\.history-share-card\s*\{/);
  assert.doesNotMatch(css, /\.history-detail-body\s*\{/);
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
  const allLevelCss = [gamingCss, officeCss, bloodmoonCss].join("\n");

  assert.doesNotMatch(allLevelCss, /\.attack-button\[data-level-theme=/);
  assert.doesNotMatch(allLevelCss, /tutorial-attack-pulse/);
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

test("电脑横屏历史详情卡采用结算页横屏尺寸", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const desktopLandscapeRule = css.match(
    /@media\s*\(orientation:\s*landscape\)\s*\{([\s\S]*)\n\}/,
  )?.[1] ?? "";

  assert.match(desktopLandscapeRule, /\.history-detail-stage\s*\{[\s\S]*--result-stage-width:\s*min\(760px/);
  assert.match(desktopLandscapeRule, /\.history-detail-stage\s*\{[\s\S]*height:\s*min\(calc\(100dvh - 18px\)/);
  assert.match(desktopLandscapeRule, /\.result-stage\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(248px,\s*0\.86fr\)/);
  assert.match(desktopLandscapeRule, /\.result-art\s*\{[\s\S]*position:\s*relative/);
  assert.match(desktopLandscapeRule, /\.result-brief\s*\{[\s\S]*overflow-y:\s*auto/);
});

test("事件轴弹层高于结算弹层避免返回时残影压住", async () => {
  const css = await readFile(new URL("../../src/styles.css", import.meta.url), "utf8");
  const modalRule = css.match(/\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const historyRule = css.match(/\.history-timeline-modal\.modal\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  const modalZ = Number(modalRule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  const historyZ = Number(historyRule.match(/z-index:\s*(\d+)/)?.[1] ?? 0);
  assert.ok(historyZ > modalZ);
});
