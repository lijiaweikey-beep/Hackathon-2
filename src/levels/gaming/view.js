const MISS_HINT = "注意主角的面朝方向，靠近一点再打！";

export function showMoveTutorial(_ui) {
}

export function showAttackTutorial(_ui) {
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
