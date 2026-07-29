import { createStoryBgm } from "../audio/createStoryBgm.js";
import { loadPlayerPreferences } from "../utils/storage.js";
import { createGameAudio } from "./createGameAudio.js";

export function createPlayerFeedback({
  navigatorTarget = globalThis.navigator,
} = {}) {
  let preferences = loadPlayerPreferences();
  const audio = createGameAudio({
    isEnabled: () => preferences.sfx !== false,
  });
  const storyBgm = createStoryBgm({
    isEnabled: () => preferences.music !== false,
  });

  function setPreferences(next) {
    preferences = next;
    storyBgm.syncEnabled();
  }

  function vibrate(pattern) {
    if (preferences.vibration === false) return;
    navigatorTarget?.vibrate?.(pattern);
  }

  return Object.freeze({
    audio,
    storyBgm,
    setPreferences,
    vibrate,
  });
}
