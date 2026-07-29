export const PREFERENCE_KEYS = Object.freeze(["sfx", "music", "vibration"]);

export const DEFAULT_PLAYER_PREFERENCES = Object.freeze({
  sfx: true,
  music: true,
  vibration: true,
});

export function normalizeToggle(value, fallback = true) {
  if (value === true || value === "on" || value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === false || value === "off" || value === "false" || value === 0 || value === "0") {
    return false;
  }
  return Boolean(fallback);
}

export function normalizePlayerPreferences(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    sfx: normalizeToggle(source.sfx, DEFAULT_PLAYER_PREFERENCES.sfx),
    music: normalizeToggle(source.music, DEFAULT_PLAYER_PREFERENCES.music),
    vibration: normalizeToggle(
      source.vibration,
      DEFAULT_PLAYER_PREFERENCES.vibration,
    ),
  };
}

export function toggleLabel(enabled) {
  return enabled ? "on" : "off";
}
