export function showMoveTutorial(_ui) {
}

export function showAttackTutorial(_ui) {
}

export function showMissHint(ui, message) {
  ui.showOverlay("tutorialMissHint", {
    className: "tutorial-overlay tutorial-miss-host",
    html: `<div class="tutorial-miss-hint">${message}</div>`,
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
