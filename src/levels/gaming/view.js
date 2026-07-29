const MISS_HINT = "注意主角的面朝方向，靠近一点再打！";

function createGuideElement() {
  const guide = document.createElement("div");
  guide.className = "tutorial-joystick-guide";
  guide.setAttribute("aria-hidden", "true");
  guide.innerHTML = `
    <div class="tutorial-joystick-pulse"></div>
    <div class="tutorial-finger"></div>
    <div class="tutorial-arrow arrow-up"></div>
    <div class="tutorial-arrow arrow-down"></div>
    <div class="tutorial-arrow arrow-left"></div>
    <div class="tutorial-arrow arrow-right"></div>
  `;
  return guide;
}

function removeGuide() {
  const guide = document.querySelector("#joystick .tutorial-joystick-guide");
  if (guide) guide.remove();
}

export function showMoveTutorial(_ui) {
  removeGuide();
  const joystick = document.getElementById("joystick");
  if (!joystick) return;
  joystick.appendChild(createGuideElement());
}

export function showAttackTutorial(_ui) {
  removeGuide();
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
  removeGuide();
  ui.hideOverlay("tutorialMissHint");
}
