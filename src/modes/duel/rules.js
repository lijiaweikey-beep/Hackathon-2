import * as THREE from "three";
import {
  DUEL_GATHER_INTERVAL,
  DUEL_GATHER_PREVIEW,
  DUEL_GATHER_WINDOW,
} from "../../config/constants.js";
import { createSeededRng } from "../../utils/rng.js";

export function formatDuelGatherCountdown(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  if (minutes > 0) return `${minutes}:${String(remainder).padStart(2, "0")}`;
  return `${total}s`;
}

export function getDuelGatherUiState({ elapsed, inCircle }) {
  const gatherIndex = Math.floor(elapsed / DUEL_GATHER_INTERVAL);
  const phaseInCycle = elapsed - gatherIndex * DUEL_GATHER_INTERVAL;
  const timeToDeadline = DUEL_GATHER_INTERVAL - phaseInCycle;
  const timeToPreview = Math.max(0, timeToDeadline - DUEL_GATHER_PREVIEW);

  if (timeToDeadline > DUEL_GATHER_PREVIEW) {
    if (timeToPreview <= 12) {
      return {
        bannerVisible: true,
        phase: "upcoming",
        seconds: timeToPreview,
        title: "即将集合报到",
        hint: "绿圈马上出现 · 站进去报到 · 最后 5 秒必须在圈内 · 否则扣 1 ❤️",
      };
    }
    return {
      bannerVisible: false,
      clueHint: `⏳ ${formatDuelGatherCountdown(timeToPreview)} 后出现集合圈 · 未报到扣 1 ❤️`,
    };
  }

  if (timeToDeadline <= 0) return null;

  const seconds = timeToDeadline;
  if (timeToDeadline <= DUEL_GATHER_WINDOW) {
    if (inCircle) {
      return {
        bannerVisible: true,
        phase: "success",
        seconds,
        title: "已在集合圈内",
        hint: `保持站立 · 剩余 ${formatDuelGatherCountdown(seconds)} · 离开会扣 1 ❤️`,
      };
    }
    return {
      bannerVisible: true,
      phase: "urgent",
      seconds,
      title: "立刻进入集合圈！",
      hint: `地面红圈内站好 · 剩余 ${formatDuelGatherCountdown(seconds)} · 未进圈扣 1 ❤️`,
    };
  }

  return {
    bannerVisible: true,
    phase: "preview",
    seconds,
    title: "集合报到",
    hint: `走到地面绿圈内 · 截止 ${formatDuelGatherCountdown(seconds)} · 最后 5 秒必须在圈里 · 否则扣 1 ❤️`,
  };
}

export function getDuelGatherHudHint(state) {
  if (!state) return "";
  if (state.bannerVisible) {
    if (state.phase === "urgent") return `🔴 ${state.title} ${formatDuelGatherCountdown(state.seconds)}`;
    if (state.phase === "success") return `✅ ${state.title} ${formatDuelGatherCountdown(state.seconds)}`;
    if (state.phase === "upcoming") return `⏳ ${formatDuelGatherCountdown(state.seconds)} 后出圈`;
    return `📍 ${state.title} · ${formatDuelGatherCountdown(state.seconds)}`;
  }
  return state.clueHint || "";
}

export function generateDuelHerdDirection(cycleIndex, worldSeed) {
  const rng = createSeededRng((worldSeed >>> 0) ^ Math.imul(cycleIndex + 1, 2654435761));
  const angle = rng() * Math.PI * 2;
  return new THREE.Vector2(Math.sin(angle), Math.cos(angle)).normalize();
}
