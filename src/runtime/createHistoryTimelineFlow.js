import { createHistoryRevealProgress } from "../progression/createHistoryRevealProgress.js";
import { createHistoryTimelineController } from "../ui/createHistoryTimelineController.js";
import { createLifeReportController } from "../ui/createLifeReportController.js";

const LIFE_REPORT_DELAY = 520;

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
  const mainline = levels.filter((level) => level.track === "mainline");
  const lifeReport = createLifeReportController({ ui, levels: mainline, storage });
  const controller = createHistoryTimelineController({
    ui,
    levels,
    storyProgress,
    revealProgress,
    onEnterLevel,
    getNpcCount,
    timerHost,
    onRevealComplete: () => {
      maybeShowLifeReport();
    },
    // 番外关解锁条件：前五关全部 A 级及以上（与人生线报告同一门槛）。
    isExtraUnlocked: () => lifeReport.isQualified(),
    // 半生通关入口：全 A 解锁后点击可随时重看报告。
    isLifeReportReady: () => lifeReport.isQualified(),
    onOpenLifeReport: () => lifeReport.show(),
  });

  function maybeShowLifeReport() {
    // 报告独立于通关/番外：只有五关全部 A 级及以上且没看过时才弹。
    if (lifeReport.hasSeen() || !lifeReport.isQualified()) return false;
    timerHost.setTimeout(() => lifeReport.maybeShow(), LIFE_REPORT_DELAY);
    return true;
  }

  function onLevelCompleted(level) {
    if (level.track !== "mainline") return false;
    const alreadyCompleted = storyProgress.isCompleted(level.id);
    const completed = storyProgress.complete(level.id);
    if (!alreadyCompleted) revealProgress.reveal(level.id);
    return completed;
  }

  function showPendingReveal() {
    return false;
  }

  function showHome() {
    controller.showBrowse();
    // 兼容刷分场景：回到事件轴时若已达成全 A 且没看过报告，补弹一次。
    return maybeShowLifeReport();
  }

  function bind() {
    controller.bind();
    lifeReport.bind();
  }

  return Object.freeze({
    bind,
    onLevelCompleted,
    showPendingReveal,
    showHome,
  });
}
