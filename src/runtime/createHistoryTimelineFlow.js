import { createHistoryRevealProgress } from "../progression/createHistoryRevealProgress.js";
import { createHistoryTimelineController } from "../ui/createHistoryTimelineController.js";

export function createHistoryTimelineFlow({
  ui,
  levels,
  storage,
  storyProgress,
  onEnterLevel,
  getNpcCount,
  timerHost = globalThis,
}) {
  const revealProgress = createHistoryRevealProgress({ levels, storage });
  const controller = createHistoryTimelineController({
    ui,
    levels,
    storyProgress,
    revealProgress,
    onEnterLevel,
    getNpcCount,
    timerHost,
  });
  let pendingRevealId = null;

  function onLevelCompleted(level) {
    if (level.track !== "mainline") return false;
    const alreadyCompleted = storyProgress.isCompleted(level.id);
    const completed = storyProgress.complete(level.id);
    if (!alreadyCompleted && controller.isRevealPending(level.id)) {
      pendingRevealId = level.id;
    }
    return completed;
  }

  function showPendingReveal() {
    if (!pendingRevealId) return false;
    const levelId = pendingRevealId;
    pendingRevealId = null;
    timerHost.setTimeout(() => {
      controller.showReveal(levelId, { openDetailAfterReveal: true });
    }, 120);
    return true;
  }

  function showHome() {
    controller.showBrowse();
    return showPendingReveal();
  }

  return Object.freeze({
    bind: controller.bind,
    onLevelCompleted,
    showPendingReveal,
    showHome,
  });
}
