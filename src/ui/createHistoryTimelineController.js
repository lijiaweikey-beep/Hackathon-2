import { getBestScore } from "../utils/storage.js";
import { renderShareCard } from "./shareCard.js";

const NODE_GAP = 260;
const TRACK_PADDING = 110;
const EXTRA_GAP = 120;
const REVEAL_AUTO_DELAY = 2000;
const REVEAL_ANIMATION_MS = 1250;

function getNodeLabel(level) {
  return level.age == null ? "番外" : `${level.age} 岁`;
}

function getNodeTitle(level) {
  return `${getNodeLabel(level)} · ${level.sceneName}`;
}

function getNodeCopy(level, npcCount = 20) {
  return level.transition?.intro
    || level.transition?.success
    || level.success
    || level.cardDesc?.({ npcCount })
    || "这段历史仍在等待记录。";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getDetailSubtitle(level) {
  return level.history?.subtitle
    ?? (level.difficulty >= 4 ? "杰作" : level.difficulty >= 3 ? "关键节点" : "历史节点");
}

function getRewardText(level) {
  if (level.history?.rewardText != null) return level.history.rewardText;
  if (level.rewardText != null) return level.rewardText;
  return `🔓 解锁回溯：${level.sceneName}历史回放。`;
}

function formatStamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join(".")
    + " "
    + [
      pad(date.getHours()),
      pad(date.getMinutes()),
    ].join(":");
}

function findLatestRevealed(levels, revealProgress) {
  for (let index = levels.length - 1; index >= 0; index -= 1) {
    if (revealProgress.isRevealed(levels[index].id)) return levels[index];
  }
  return levels[0] ?? null;
}

function findFirstPending(levels, storyProgress, revealProgress) {
  return levels.find((level) =>
    storyProgress.isCompleted(level.id) && !revealProgress.isRevealed(level.id)
  ) ?? null;
}

export function createHistoryTimelineController({
  ui,
  levels,
  storyProgress,
  revealProgress,
  onEnterLevel,
  getNpcCount = () => 20,
  version = "v0.10.x.1",
  clock = () => new Date(),
  timerHost = globalThis,
  isExtraUnlocked: isExtraUnlockedOverride,
  onRevealComplete,
  isLifeReportReady,
  onOpenLifeReport,
}) {
  let focusId = null;
  let detailId = null;
  let revealTimer = null;
  let revealLocked = false;
  let lastPointerMoved = false;
  let dragState = null;

  function clearRevealTimer() {
    if (!revealTimer) return;
    timerHost.clearTimeout(revealTimer);
    revealTimer = null;
  }

  function setStatus(text) {
    if (ui.historyStatusText) ui.historyStatusText.textContent = text;
  }

  function setDetail(level, prefix = "历史节点") {
    if (!ui.historyNodeDetail || !level) return;
    ui.historyNodeDetail.innerHTML = `
      <strong>${prefix}：${getNodeTitle(level)}</strong>
      <span>${getNodeCopy(level, getNpcCount(level))}</span>
    `;
  }

  function isExtraUnlocked() {
    // 允许外部注入更严的解锁条件（如：主线全通 + 看过人生线报告）。
    return isExtraUnlockedOverride
      ? Boolean(isExtraUnlockedOverride())
      : storyProgress.isComplete?.() ?? false;
  }

  function isEnterable(level) {
    return level.track !== "mainline"
      ? isExtraUnlocked()
      : storyProgress.isUnlocked(level.id);
  }

  function getState(level) {
    const completed = storyProgress.isCompleted(level.id);
    const revealed = revealProgress.isRevealed(level.id);
    if (completed && !revealed && level.id === focusId) return "sealed";
    if (!isEnterable(level)) return "fog";
    return completed && revealed ? "unlocked" : "open";
  }

  function getFocusLevel() {
    return levels.find((level) => level.id === focusId) ?? null;
  }

  function getUnlockedDetailLevels() {
    return levels.filter((level) =>
      storyProgress.isCompleted(level.id) && revealProgress.isRevealed(level.id)
    );
  }

  function centerOn(id, behavior = "smooth") {
    if (!id || !ui.historyViewport || !ui.historyTrack) return;
    const card = [...ui.historyTrack.querySelectorAll(".history-node-card")]
      .find((node) => node.dataset.historyNode === id);
    if (!card) return;
    const left = card.offsetLeft - (ui.historyViewport.clientWidth - card.offsetWidth) / 2;
    ui.historyViewport.scrollTo({
      left: Math.max(0, left),
      behavior,
    });
  }

  function appendLoreButton(level, x) {
    const lore = document.createElement("button");
    lore.type = "button";
    lore.className = "history-node-lore";
    lore.dataset.historyLore = level.id;
    lore.setAttribute("aria-label", `查看${level.sceneName}的历史记录`);
    lore.textContent = "📖";
    lore.style.setProperty("--x", `${x}px`);
    lore.addEventListener("click", (event) => {
      event.stopPropagation();
      setStatus(`历史节点已记录：${level.sceneName}`);
      setDetail(level, "历史节点已记录");
      openDetail(level.id);
    });
    ui.historyTrack.appendChild(lore);
  }

  function appendNodeCard(level, index, geometry) {
    const { x } = geometry;
    const state = getState(level);
    const hidden = state === "fog";
    const seal = '<span class="history-seal-eye" aria-hidden="true"></span>'
      + '<span class="history-chain chain-a" aria-hidden="true"></span>'
      + '<span class="history-chain chain-b" aria-hidden="true"></span>';

    const tick = document.createElement("span");
    tick.className = `history-diamond ${state === "unlocked" ? "lit" : ""}`;
    tick.style.setProperty("--x", `${x + 108}px`);
    tick.setAttribute("aria-hidden", "true");
    ui.historyTrack.appendChild(tick);

    const card = document.createElement("button");
    card.type = "button";
    card.className = `history-node-card ${state}`;
    card.dataset.historyNode = level.id;
    card.style.setProperty("--x", `${x}px`);
    card.disabled = false;
    let artHtml;
    if (hidden) {
      artHtml = level.coverUrl
        ? `<img class="history-node-cover fog-cover" src="${escapeHtml(level.coverUrl)}" alt="" loading="lazy">
           <span class="history-node-fog-mask"></span>
           <span class="history-node-fog-icon" aria-hidden="true">?</span>`
        : `<span class="history-node-fog-icon" aria-hidden="true">?</span>`;
    } else if (level.coverUrl) {
      artHtml = `<img class="history-node-cover" src="${escapeHtml(level.coverUrl)}" alt="${escapeHtml(level.sceneName)}" loading="lazy">`;
    } else {
      artHtml = level.emoji;
    }

    card.innerHTML = `
      <span class="history-node-age">${getNodeLabel(level)}</span>
      <span class="history-node-art" aria-hidden="true">${artHtml}</span>
      <span class="history-node-name">${escapeHtml(level.axisLabel ?? level.sceneName)}</span>
      ${hidden
        ? '<span class="history-node-badge">待解锁</span>'
        : `<span class="history-node-copy">${getNodeCopy(level, getNpcCount(level))}</span>`}
      ${state === "sealed" ? seal : ""}
      ${hidden || state === "sealed" ? "" : '<span class="history-node-enter">▶ 进入关卡</span>'}
    `;
    card.addEventListener("click", (event) => {
      event.stopPropagation();
      if (state === "sealed") {
        startReveal();
        return;
      }
      if (hidden) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        setStatus("前置历史尚未查明");
        return;
      }
      setStatus(`正在进入：${level.sceneName}`);
      setDetail(level, "正在进入");
      onEnterLevel?.(level.id);
    });

    ui.historyTrack.appendChild(card);
    // 有结算记录（含失败）就给历史记录入口；封印/迷雾状态除外。
    if (state === "unlocked" || (state === "open" && getBestScore(level.id))) {
      appendLoreButton(level, x);
    }
  }

  function renderTimeline() {
    if (!ui.historyTrack) return;
    ui.historyTrack.innerHTML = "";
    const firstExtraIndex = levels.findIndex((level) => level.track !== "mainline");
    const hasExtra = firstExtraIndex >= 0;
    const shiftAt = (index) => (hasExtra && index >= firstExtraIndex ? EXTRA_GAP : 0);
    ui.historyTrack.style.width = `${TRACK_PADDING * 2
      + Math.max(0, levels.length - 1) * NODE_GAP
      + 244
      + (hasExtra ? EXTRA_GAP : 0)}px`;

    const axis = document.createElement("div");
    axis.className = "history-axis";
    axis.innerHTML = `
      <span class="history-axis-glyph start" aria-hidden="true">∞</span>
      <span class="history-axis-line" aria-hidden="true"></span>
      <span class="history-axis-glyph end" aria-hidden="true">☁</span>
    `;
    ui.historyTrack.appendChild(axis);

    if (hasExtra) {
      // “半生通关”入口顶替原“人生之外”分隔：形态不变，锁定/点击走人生报告逻辑。
      const reportReady = isLifeReportReady?.() ?? true;
      const divider = document.createElement("button");
      divider.type = "button";
      divider.className = `history-track-divider ${reportReady ? "unlocked" : "locked"}`;
      divider.textContent = "半生通关";
      divider.setAttribute("aria-label", reportReady ? "查看人生线报告" : "半生通关未解锁");
      divider.style.setProperty(
        "--x",
        // 胶囊中心落在第五关卡右缘与首张番外卡左缘的正中（卡宽 228）。
        `${TRACK_PADDING + firstExtraIndex * NODE_GAP + (228 - NODE_GAP + EXTRA_GAP) / 2}px`,
      );
      divider.addEventListener("click", (event) => {
        event.stopPropagation();
        if (isLifeReportReady?.() ?? true) {
          onOpenLifeReport?.();
          return;
        }
        setStatus("五关全部拿到 A 级以上，才能解锁人生线报告");
      });
      ui.historyTrack.appendChild(divider);
    }

    levels.forEach((level, index) => {
      appendNodeCard(level, index, {
        x: TRACK_PADDING + index * NODE_GAP + shiftAt(index),
      });
    });
  }

  function renderHeader() {
    if (ui.historyVersionText) ui.historyVersionText.textContent = version;
    if (ui.historyStampText) ui.historyStampText.textContent = formatStamp(clock());
  }

  function render({ mode = "browse" } = {}) {
    const pending = findFirstPending(levels, storyProgress, revealProgress);
    if (!focusId) {
      focusId = mode === "reveal"
        ? pending?.id ?? findLatestRevealed(levels, revealProgress)?.id ?? null
        : findLatestRevealed(levels, revealProgress)?.id ?? pending?.id ?? null;
    }
    renderHeader();
    renderTimeline();

    const focusLevel = getFocusLevel();
    if (mode === "reveal" && focusLevel && !revealProgress.isRevealed(focusLevel.id)) {
      setStatus("1个历史节点即将被揭晓……");
      setDetail(focusLevel, "封印中的历史节点");
    } else if (focusLevel) {
      setStatus("点选节点进入关卡");
      setDetail(focusLevel, "历史节点");
    } else {
      setStatus("点选节点进入关卡");
      if (ui.historyNodeDetail) ui.historyNodeDetail.textContent = "";
    }

    timerHost.requestAnimationFrame?.(() => centerOn(focusId, "smooth"));
  }

  function show({
    mode = "browse",
    focusId: nextFocusId = null,
    autoReveal = false,
  } = {}) {
    clearRevealTimer();
    revealLocked = false;
    focusId = nextFocusId;
    ui.historyTimelineModal?.classList.add("visible");
    render({ mode });
    if (mode === "reveal" && autoReveal) {
      revealTimer = timerHost.setTimeout(startReveal, REVEAL_AUTO_DELAY);
    }
  }

  function hide() {
    clearRevealTimer();
    closeDetail();
    ui.historyTimelineModal?.classList.remove("visible");
  }

  function getMainlineProgress() {
    const mainline = levels.filter((level) => level.track === "mainline");
    return {
      total: mainline.length,
      unlocked: mainline.filter((level) => storyProgress.isCompleted(level.id)).length,
    };
  }

  // 历史详情：与结算页共用 result-stage（插画 + slug + brief）架构。
  function renderDetailCard(level, best) {
    const grade = best?.grade ?? "C";
    const failed = best?.won === false;
    const gradeNode = best && !failed ? level.nodes?.[grade] : null;
    const globalIndex = levels.findIndex(({ id }) => id === level.id);
    const artUrl = level.art?.grades?.[grade] ?? level.art?.cover ?? "";

    if (ui.historyDetailArt) {
      ui.historyDetailArt.style.backgroundImage = artUrl ? `url("${artUrl}")` : "";
      ui.historyDetailArt.classList.toggle("is-empty", !artUrl);
    }
    if (ui.historyDetailLevelTag) {
      ui.historyDetailLevelTag.textContent = `LV.${String(Math.max(globalIndex, 0) + 1).padStart(2, "0")}`;
    }
    if (ui.historyDetailAgeTag) {
      ui.historyDetailAgeTag.textContent = level.age != null ? `${level.age}岁` : "";
      ui.historyDetailAgeTag.hidden = level.age == null;
    }
    if (ui.historyDetailRating) {
      ui.historyDetailRating.textContent = failed ? "—" : grade;
      ui.historyDetailRating.className = failed
        ? "result-rating"
        : `result-rating rating-${String(grade).toLowerCase()}`;
    }
    if (ui.historyDetailCopy) {
      ui.historyDetailCopy.textContent = gradeNode?.verdict
        ?? (failed ? (level.failure ?? "暂无通关记录") : (level.success ?? ""));
    }

    const canvas = ui.historyDetailShareCanvas;
    const payload = {
      level,
      result: {
        won: !failed,
        timeUsed: best?.time,
        rating: { grade, rating: best?.rating ?? 0 },
      },
      progress: getMainlineProgress(),
    };
    if (canvas?.getContext) {
      renderShareCard(canvas, payload);
      // 番外关统一保留手绘卡面（与“超市取证”一致），不再贴等级图。
      const artSrc = level.track === "extra" ? null : artUrl;
      if (artSrc && typeof Image === "function") {
        const image = new Image();
        image.onload = () => {
          if (detailId === level.id) renderShareCard(canvas, { ...payload, art: image });
        };
        image.src = artSrc;
      }
    }
  }

  // 右侧数据：复用结算页 result-stats / stat-row。
  function renderDetailStats(best) {
    if (!ui.historyDetailStats) return;
    if (!best) {
      ui.historyDetailStats.innerHTML = "";
      return;
    }
    const failed = best.won === false;
    const rows = [
      ["🏅 最佳评级", failed ? "未通关" : `${best.grade} 级`],
      best.time != null ? [failed ? "⏱ 坚持用时" : "⏱ 完成用时", `${best.time} 秒`] : null,
      best.attemptsLeft != null ? ["🥊 剩余出拳", `${best.attemptsLeft} 次`] : null,
      best.completedAt != null
        ? [failed ? "📅 结算时间" : "📅 完成时间", formatStamp(new Date(best.completedAt))]
        : null,
    ].filter(Boolean);
    ui.historyDetailStats.innerHTML = rows
      .map(([label, value]) =>
        `<div class="stat-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
      .join("");
  }

  function saveDetailShareCard() {
    const canvas = ui.historyDetailShareCanvas;
    if (!canvas?.toDataURL || !detailId) return;
    const level = levels.find(({ id }) => id === detailId);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `梗哥的半生-${level?.sceneName ?? "历史节点"}.png`;
    link.click();
  }

  function renderDetail(level) {
    const detailLevels = getUnlockedDetailLevels();
    const detailIndex = detailLevels.findIndex(({ id }) => id === level.id);
    const globalIndex = levels.findIndex(({ id }) => id === level.id);
    const best = getBestScore(level.id);
    const title = level.history?.title ?? `第${globalIndex + 1}章 - ${level.sceneName}`;
    const gradeNode = best && best.won !== false ? level.nodes?.[best.grade] : null;

    if (ui.historyDetailSubtitle) ui.historyDetailSubtitle.textContent = getDetailSubtitle(level);
    if (ui.historyDetailTitle) {
      ui.historyDetailTitle.textContent = gradeNode?.title ? `「${gradeNode.title}」` : title;
    }
    renderDetailCard(level, best);
    renderDetailStats(best);
    if (ui.historyDetailReward) ui.historyDetailReward.textContent = getRewardText(level);
    if (ui.historyDetailPrev) ui.historyDetailPrev.hidden = detailIndex <= 0;
    if (ui.historyDetailNext) ui.historyDetailNext.hidden = detailIndex < 0 || detailIndex >= detailLevels.length - 1;
  }

  function openDetail(levelId) {
    const level = levels.find(({ id }) => id === levelId);
    if (!level) return;
    // 已解锁的历史节点或留有结算记录（含失败）的关卡都能看详情。
    const state = getState(level);
    if (state !== "unlocked" && !(state === "open" && getBestScore(level.id))) return;
    detailId = level.id;
    renderDetail(level);
    ui.historyDetailModal?.classList.add("visible");
  }

  function closeDetail() {
    detailId = null;
    ui.historyDetailModal?.classList.remove("visible");
  }

  function moveDetail(offset) {
    const detailLevels = getUnlockedDetailLevels();
    const currentIndex = detailLevels.findIndex(({ id }) => id === detailId);
    const next = detailLevels[currentIndex + offset];
    if (next) openDetail(next.id);
  }

  function startReveal() {
    const level = getFocusLevel();
    if (!level || revealLocked || revealProgress.isRevealed(level.id)) return;
    clearRevealTimer();
    revealLocked = true;
    revealProgress.reveal(level.id);
    setStatus("历史封印正在解除……");

    const card = [...(ui.historyTrack?.querySelectorAll(".history-node-card") ?? [])]
      .find((node) => node.dataset.historyNode === level.id);
    card?.classList.add("revealing");

    timerHost.setTimeout(() => {
      revealLocked = false;
      render({ mode: "browse" });
      setStatus(`历史节点已记录：${level.sceneName}`);
      setDetail(level, "历史节点已记录");
      centerOn(level.id, "smooth");
      onRevealComplete?.(level);
    }, REVEAL_ANIMATION_MS);
  }

  function showBrowse() {
    show({ mode: "browse" });
  }

  function showReveal(levelId) {
    show({
      mode: "reveal",
      focusId: levelId,
      autoReveal: true,
    });
  }

  function showUnlock(levelId) {
    const level = levels.find(({ id }) => id === levelId);
    if (!level) return false;
    show({ mode: "browse", focusId: levelId });
    setStatus(`新节点已解锁：${level.sceneName}`);
    setDetail(level, "新节点已解锁");
    const card = [...(ui.historyTrack?.querySelectorAll(".history-node-card") ?? [])]
      .find((node) => node.dataset.historyNode === levelId);
    card?.classList.add("unlocking");
    return Boolean(card);
  }

  function bindDrag() {
    const viewport = ui.historyViewport;
    if (!viewport) return;
    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button, .history-node-card")) return;
      dragState = {
        x: event.clientX,
        scrollLeft: viewport.scrollLeft,
      };
      lastPointerMoved = false;
      viewport.setPointerCapture?.(event.pointerId);
      viewport.classList.add("dragging");
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!dragState) return;
      const delta = event.clientX - dragState.x;
      if (Math.abs(delta) > 4) lastPointerMoved = true;
      viewport.scrollLeft = dragState.scrollLeft - delta;
    });
    const endDrag = (event) => {
      if (!dragState) return;
      dragState = null;
      viewport.releasePointerCapture?.(event.pointerId);
      viewport.classList.remove("dragging");
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
  }

  function bind() {
    ui.historyTimelineModal?.addEventListener("click", () => {
      if (ui.historyDetailModal?.classList.contains("visible")) return;
      if (lastPointerMoved) return;
      const level = getFocusLevel();
      if (level && getState(level) === "sealed") startReveal();
    });
    ui.historyDetailPanel?.addEventListener("click", (event) => event.stopPropagation());
    ui.historyDetailBackdrop?.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDetail();
    });
    ui.historyDetailClose?.addEventListener("click", (event) => {
      event.stopPropagation();
      closeDetail();
    });
    ui.historyDetailSave?.addEventListener("click", (event) => {
      event.stopPropagation();
      saveDetailShareCard();
    });
    ui.historyDetailReplay?.addEventListener("click", (event) => {
      event.stopPropagation();
      const levelId = detailId;
      if (!levelId) return;
      closeDetail();
      onEnterLevel?.(levelId);
    });
    ui.historyDetailPrev?.addEventListener("click", (event) => {
      event.stopPropagation();
      moveDetail(-1);
    });
    ui.historyDetailNext?.addEventListener("click", (event) => {
      event.stopPropagation();
      moveDetail(1);
    });
    bindDrag();
  }

  return Object.freeze({
    bind,
    show,
    showBrowse,
    showReveal,
    showUnlock,
    hide,
    isRevealPending: (id) => storyProgress.isCompleted(id) && !revealProgress.isRevealed(id),
    getPendingReveal: () => findFirstPending(levels, storyProgress, revealProgress),
  });
}
