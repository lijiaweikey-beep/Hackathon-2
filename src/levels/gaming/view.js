const MOVE_SUBTITLE = "凌晨 3 点，找到发光舍友";
const ATTACK_SUBTITLE = "找到发光舍友，一拳出击！";
const MISS_HINT = "注意主角的面朝方向，靠近一点再打！";

function subtitleHtml(text, { typing = false } = {}) {
  return `
    <div class="tutorial-subtitle${typing ? " typing" : ""}">${text}</div>
  `;
}

export function showMoveTutorial(ui) {
  ui.showOverlay("tutorialSubtitle", {
    className: "tutorial-overlay tutorial-subtitle-host",
    html: subtitleHtml(MOVE_SUBTITLE, { typing: true }),
    ariaLive: "polite",
  });
}

export function showAttackTutorial(ui) {
  ui.showOverlay("tutorialSubtitle", {
    className: "tutorial-overlay tutorial-subtitle-host",
    html: subtitleHtml(ATTACK_SUBTITLE, { typing: true }),
    ariaLive: "polite",
  });
}

export function showMissHint(ui) {
  ui.showOverlay("tutorialMissHint", {
    className: "tutorial-overlay tutorial-miss-host",
    html: `<div class="tutorial-miss-hint">${MISS_HINT}</div>`,
    ariaLive: "assertive",
  });
}

export function hideMissHint(ui) {
  ui.hideOverlay("tutorialMissHint");
}

export function hideTutorialOverlays(ui) {
  ui.hideOverlay("tutorialSubtitle");
  ui.hideOverlay("tutorialMissHint");
}
