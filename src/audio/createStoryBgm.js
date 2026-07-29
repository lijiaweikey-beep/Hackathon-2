/**
 * 人生主线 BGM（与关卡玩法解耦）
 *
 * 规则：
 * - 打开游戏 → 循环播放入场曲
 * - 点击「开始游戏」→ 停止入场曲
 * - 点击「进入关卡」且年龄命中映射 → 循环播放对应关曲
 * - 任务成功 / 任务失败 → 停止 BGM
 */

function resolveAudioUrl(fileName) {
  const base = import.meta.env?.BASE_URL ?? "/";
  return `${base}audio/${fileName}`;
}

const INTRO_SRC = resolveAudioUrl("intro.mp3");

/** 年龄 → 关卡曲（19/21/23/27/30 岁主线） */
const AGE_TRACKS = Object.freeze({
  19: resolveAudioUrl("level-1.mp3"),
  21: resolveAudioUrl("level-2.mp3"),
  23: resolveAudioUrl("level-3.mp3"),
  27: resolveAudioUrl("level-4.mp3"),
  30: resolveAudioUrl("level-5.mp3"),
});

function safePlay(audio) {
  const result = audio.play?.();
  if (result && typeof result.catch === "function") {
    return result.catch(() => false);
  }
  return Promise.resolve(true);
}

/**
 * @param {object} [options]
 * @param {string} [options.introSrc]
 * @param {Readonly<Record<number, string>>} [options.ageTracks]
 * @param {number} [options.volume]
 * @param {typeof Audio} [options.AudioCtor]
 * @param {Document | null} [options.documentTarget]
 */
export function createStoryBgm({
  introSrc = INTRO_SRC,
  ageTracks = AGE_TRACKS,
  volume = 0.55,
  AudioCtor = globalThis.Audio,
  documentTarget = globalThis.document,
} = {}) {
  let current = null;
  let introWanted = false;
  let unlockHandler = null;

  function disarmIntroUnlock() {
    if (!unlockHandler || !documentTarget) {
      unlockHandler = null;
      return;
    }
    documentTarget.removeEventListener("pointerdown", unlockHandler);
    documentTarget.removeEventListener("keydown", unlockHandler);
    unlockHandler = null;
  }

  function armIntroUnlock() {
    if (unlockHandler || !documentTarget) return;
    unlockHandler = () => {
      if (!introWanted || !current) {
        disarmIntroUnlock();
        return;
      }
      safePlay(current).then((ok) => {
        if (ok !== false) disarmIntroUnlock();
      });
    };
    documentTarget.addEventListener("pointerdown", unlockHandler);
    documentTarget.addEventListener("keydown", unlockHandler);
  }

  function stopCurrent() {
    if (!current) return;
    try {
      current.pause();
      current.currentTime = 0;
    } catch {
      // ignore teardown errors from partially constructed Audio
    }
    current = null;
  }

  function playSrc(src, { loop = true } = {}) {
    if (!AudioCtor || !src) return null;
    stopCurrent();
    const audio = new AudioCtor(src);
    audio.loop = loop;
    audio.volume = volume;
    audio.preload = "auto";
    current = audio;
    return audio;
  }

  function playIntro() {
    introWanted = true;
    const audio = playSrc(introSrc, { loop: true });
    if (!audio) return;
    safePlay(audio).then((ok) => {
      // 浏览器拦截自动播放时，等首次手势再恢复入场曲
      if (ok === false || audio.paused) armIntroUnlock();
      else disarmIntroUnlock();
    });
  }

  /**
   * 按关卡年龄播放对应曲目；未映射年龄则静音（番外不播主线曲）。
   * @param {number | null | undefined} age
   * @returns {boolean} 是否开始播放
   */
  function playForAge(age) {
    introWanted = false;
    disarmIntroUnlock();
    const src = ageTracks[age];
    if (!src) {
      stopCurrent();
      return false;
    }
    const audio = playSrc(src, { loop: true });
    if (!audio) return false;
    safePlay(audio);
    return true;
  }

  /** 按关卡 definition 播放（读取 level.age） */
  function playForLevel(level) {
    return playForAge(level?.age);
  }

  function stop() {
    introWanted = false;
    disarmIntroUnlock();
    stopCurrent();
  }

  function dispose() {
    stop();
  }

  return Object.freeze({
    playIntro,
    playForAge,
    playForLevel,
    stop,
    dispose,
    get currentSrc() {
      return current?.src ?? null;
    },
    get isPlaying() {
      return Boolean(current && !current.paused);
    },
  });
}

export { AGE_TRACKS, INTRO_SRC, resolveAudioUrl };
