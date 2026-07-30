import { clearChildren } from "./domWrite.js";

const TYPE_INTERVAL_MS = 72;
const LINE_PAUSE_MS = 380;

export function getStoryIntroLines(level = {}) {
  if (Array.isArray(level.storyIntro) && level.storyIntro.length > 0) {
    return level.storyIntro;
  }
  return [level.transition?.intro, "别让我逮到你！！"].filter(Boolean);
}

// 打字机剧情弹窗：逐字打出剧情，第一次点击快进，打完后点击任意处开始。
export function createStoryIntroPlayer({ ui, timerHost = globalThis }) {
  let timer = null;
  let playing = false;
  let typingDone = false;
  let lines = [];
  let lineElements = [];
  let onDone = null;

  function clearTimer() {
    if (!timer) return;
    timerHost.clearTimeout(timer);
    timer = null;
  }

  function showHint() {
    typingDone = true;
    if (ui.storyIntroHint) ui.storyIntroHint.hidden = false;
  }

  function fillAll() {
    clearTimer();
    lineElements.forEach((element, index) => {
      element.textContent = lines[index];
    });
    showHint();
  }

  function typeAt(lineIndex, charIndex) {
    if (!playing) return;
    if (lineIndex >= lines.length) {
      showHint();
      return;
    }
    const line = lines[lineIndex];
    if (charIndex < line.length) {
      lineElements[lineIndex].textContent = line.slice(0, charIndex + 1);
      timer = timerHost.setTimeout(() => typeAt(lineIndex, charIndex + 1), TYPE_INTERVAL_MS);
      return;
    }
    timer = timerHost.setTimeout(() => typeAt(lineIndex + 1, 0), LINE_PAUSE_MS);
  }

  function dismiss() {
    clearTimer();
    playing = false;
    ui.storyIntroModal?.classList.remove("visible");
    const finish = onDone;
    onDone = null;
    finish?.();
  }

  function handleClick() {
    if (!playing) return;
    if (!typingDone) {
      fillAll();
      return;
    }
    dismiss();
  }

  function play(level, nextOnDone) {
    if (!ui.storyIntroModal || !ui.storyIntroText) {
      nextOnDone?.();
      return;
    }
    clearTimer();
    playing = true;
    typingDone = false;
    onDone = nextOnDone;
    lines = getStoryIntroLines(level);
    clearChildren(ui.storyIntroText);
    lineElements = lines.map(() => {
      const element = document.createElement("p");
      element.className = "story-intro-line";
      ui.storyIntroText.appendChild(element);
      return element;
    });
    if (ui.storyIntroHint) ui.storyIntroHint.hidden = true;
    ui.storyIntroModal.classList.add("visible");
    timer = timerHost.setTimeout(() => typeAt(0, 0), TYPE_INTERVAL_MS);
  }

  function bind() {
    ui.storyIntroModal?.addEventListener("click", handleClick);
  }

  return Object.freeze({ bind, play, isPlaying: () => playing });
}
