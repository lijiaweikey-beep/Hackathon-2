const MISS_HINT = "注意主角的面朝方向，靠近一点再打！";

function guideHtml() {
  return `
    <div class="tutorial-joystick-guide" aria-hidden="true">
      <div class="tutorial-joystick-pulse"></div>
      <div class="tutorial-finger"></div>
      <div class="tutorial-arrow arrow-up"></div>
      <div class="tutorial-arrow arrow-down"></div>
      <div class="tutorial-arrow arrow-left"></div>
      <div class="tutorial-arrow arrow-right"></div>
    </div>
  `;
}

export function showMoveTutorial(ui) {
  ui.showOverlay("tutorialJoystickGuide", {
    className: "tutorial-overlay tutorial-joystick-host",
    html: guideHtml(),
    ariaLive: "off",
  });
}

export function showAttackTutorial(ui) {
  ui.hideOverlay("tutorialJoystickGuide");
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
