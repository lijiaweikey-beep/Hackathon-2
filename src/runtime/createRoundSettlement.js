import { GAME_PHASES } from "../core/gamePhase.js";

export function createRoundSettlement(dependencies) {
  const timerHost = dependencies.timerHost ?? globalThis;
  let pendingTimer = null;

  function clearPending() {
    if (!pendingTimer) return;
    timerHost.clearTimeout(pendingTimer);
    pendingTimer = null;
  }

  function finish(won, failMessage, resultOverride) {
    const { session } = dependencies;
    if ([GAME_PHASES.RESULT, GAME_PHASES.LEVEL_SELECT].includes(session.phase)) return;
    if (!session.levelState?.level || !dependencies.hasScene()) return;
    clearPending();
    if (session.phase === GAME_PHASES.PLAYING) {
      session.transition(GAME_PHASES.SETTLING);
    }
    if (session.phase !== GAME_PHASES.SETTLING) return;

    const player = dependencies.getPlayer();
    if (player) player.cheer = won;
    if (won) dependencies.playWin(); else dependencies.playLose();
    const resultResource = resultOverride ?? dependencies.getResultStats();
    const timeUsed = Math.round(
      dependencies.getTotalTime() - session.levelState.startTime,
    );
    const attemptsLeft = resultResource?.attemptsLeft
      ?? session.levelState.attempts;
    const rating = dependencies.calculateRating(won, timeUsed, attemptsLeft);
    session.setResult({ won, failMessage, timeUsed, attemptsLeft, rating });
    session.transition(GAME_PHASES.RESULT);
    dependencies.showResult({
      won,
      failMessage,
      resultResource,
      timeUsed,
      attemptsLeft,
      rating,
    });

    // 胜负都落结算记录（失败记录带 won:false，永不覆盖胜利记录）。
    dependencies.saveBestScore(session.levelState.level.id, {
      won,
      grade: rating.grade,
      rating: rating.rating,
      time: timeUsed,
      attemptsLeft,
      completedAt: Date.now(),
    });
    if (won) {
      dependencies.onLevelCompleted?.(session.levelState.level);
      return;
    }
    const data = player?.group?.userData;
    if (!data) return;
    data.visual.position.y = 0;
    data.leftArm.rotation.z = 0.9;
    data.rightArm.rotation.z = -0.9;
  }

  function settle(won, failMessage, delayMs = won ? 500 : 400) {
    if (dependencies.session.phase !== GAME_PHASES.PLAYING) return;
    dependencies.session.transition(GAME_PHASES.SETTLING);
    clearPending();
    pendingTimer = timerHost.setTimeout(() => {
      pendingTimer = null;
      finish(won, failMessage);
    }, delayMs);
  }

  return Object.freeze({ clearPending, finish, settle });
}
