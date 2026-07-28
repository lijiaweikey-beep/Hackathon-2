const HUNT_INTRO_HTML = `
  <div class="hunt-intro-moon"></div>
  <div class="hunt-intro-title">猎杀时刻</div>
  <div class="hunt-intro-quote">“认不出自己的人，都会留在月光外。”</div>
`;

const HUNT_CARD_HTML = `
  <div class="hunt-card-title">血月引路人</div>
  <div class="hunt-card-quote">“认不出自己的人，都会留在月光外。”</div>
  <div class="hunt-card-rule">机制 1：关闭这张卡片后，玩家和所有 NPC 会立刻随机散落到地图任意位置。</div>
  <div class="hunt-card-rule">机制 2：你的狼人耳朵、狼爪和披风会暂时消失，NPC 也会暂停攻击。</div>
  <div class="hunt-card-rule">机制 3：你有 20 秒找到自己，并进入任意一个绿色安全区域。</div>
  <div class="hunt-card-rule">处决：倒计时结束时，绿色区域外的所有生物都会被血月秒杀。</div>
  <button class="hunt-card-button" type="button" data-level-action="beginSpecialPhase">关闭卡片，开始倒计时</button>
`;

export function showHuntIntro(ui) {
  ui.showOverlay("huntIntro", {
    className: "hunt-intro",
    html: HUNT_INTRO_HTML,
    ariaLive: "assertive",
  });
}

export function showHuntCard(ui) {
  ui.showOverlay("huntCard", {
    className: "hunt-card",
    html: HUNT_CARD_HTML,
    ariaLive: "polite",
  });
}

export function hideHuntIntro(ui) {
  ui.hideOverlay("huntIntro");
}

export function hideHuntCard(ui) {
  ui.hideOverlay("huntCard");
}

export function hideBloodmoonOverlays(ui) {
  hideHuntIntro(ui);
  hideHuntCard(ui);
}
