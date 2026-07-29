/**
 * 人生主线 BGM（与关卡玩法解耦）
 *
 * 规则：
 * - 打开作品 → 循环播放入场曲（选关页继续播放）
 * - 点击「进入关卡」且年龄命中映射 → 停止入场曲，循环播放对应关曲
 * - 任务成功 / 任务失败 → 停止 BGM
 * - 返回选关页 → 恢复入场曲
 * - 全局音乐开关可随时静音 / 恢复当前意图曲目
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
 * @param {() => boolean} [options.isEnabled]
 */
export function createStoryBgm({
  introSrc = INTRO_SRC,
  ageTracks = AGE_TRACKS,
  volume = 0.55,
  AudioCtor = globalThis.Audio,
  documentTarget = globalThis.document,
  isEnabled = () => true,
} = {}) {
  let current = null;
  let introWanted = false;
  let desiredAge = null;
  let unlockHandler = null;

  function musicOn() {
    return isEnabled() !== false;
  }

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
      if (!introWanted || !current || !musicOn()) {
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

  function startCurrent(audio, { allowUnlock = false } = {}) {
    if (!audio) return;
    if (!musicOn()) {
      audio.pause();
      return;
    }
    safePlay(audio).then((ok) => {
      if (!allowUnlock) {
        disarmIntroUnlock();
        return;
      }
      if (ok === false || audio.paused) armIntroUnlock();
      else disarmIntroUnlock();
    });
  }

  function playIntro() {
    introWanted = true;
    desiredAge = null;
    const audio = playSrc(introSrc, { loop: true });
    startCurrent(audio, { allowUnlock: true });
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
      desiredAge = null;
      stopCurrent();
      return false;
    }
    desiredAge = age;
    const audio = playSrc(src, { loop: true });
    if (!audio) return false;
    startCurrent(audio);
    return true;
  }

  /** 按关卡 definition 播放（读取 level.age） */
  function playForLevel(level) {
    return playForAge(level?.age);
  }

  function stop() {
    introWanted = false;
    desiredAge = null;
    disarmIntroUnlock();
    stopCurrent();
  }

  /** 全局音乐开关变化时暂停或恢复当前意图曲目 */
  function syncEnabled() {
    if (!musicOn()) {
      disarmIntroUnlock();
      if (current) current.pause();
      return;
    }
    if (introWanted) {
      if (current) startCurrent(current, { allowUnlock: true });
      else playIntro();
      return;
    }
    if (desiredAge != null) {
      if (current) startCurrent(current);
      else playForAge(desiredAge);
    }
  }

  function dispose() {
    stop();
  }

  return Object.freeze({
    playIntro,
    playForAge,
    playForLevel,
    stop,
    syncEnabled,
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
