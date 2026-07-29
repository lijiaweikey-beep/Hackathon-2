const MOVE_SUBTITLE = "凌晨 3 点，移动到绿色光圈";
const ATTACK_SUBTITLE = "找到发光舍友，一拳出击！";
const MISS_HINT = "注意主角的面朝方向，靠近一点再打！";

function subtitleHtml(text, { typing = false } = {}) {
  return `
    <div class="tutorial-subtitle${typing ? " typing" : ""}">${text}</div>
  `;
}

function guideHtml() {
  return `
    <div class="tutorial-joystick-guide" aria-hidden="true">
      <div class="tutorial-joystick-pulse"></div>
      <div class="tutorial-finger"></div>
    </div>
  `;
}

export function showMoveTutorial(ui) {
  ui.showOverlay("tutorialSubtitle", {
    className: "tutorial-overlay tutorial-subtitle-host",
    html: subtitleHtml(MOVE_SUBTITLE, { typing: true }),
    ariaLive: "polite",
  });
  ui.showOverlay("tutorialJoystickGuide", {
    className: "tutorial-overlay tutorial-joystick-host",
    html: guideHtml(),
    ariaLive: "off",
  });
}

export function showAttackTutorial(ui) {
  ui.hideOverlay("tutorialJoystickGuide");
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
  ui.hideOverlay("tutorialJoystickGuide");
  ui.hideOverlay("tutorialMissHint");
}
