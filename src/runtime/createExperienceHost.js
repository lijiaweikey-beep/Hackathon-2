function freezeGroup(value) {
  return Object.freeze({ ...(value ?? {}) });
}

export function createExperienceHost({
  definition,
  scope,
  time,
  rendering,
  surface,
  input,
  audio,
  flow,
  storageBackend = localStorage,
  randomRange,
}) {
  const storagePrefix = `level:${definition.id}:`;
  const storage = Object.freeze({
    get(key, fallback = null) {
      const value = storageBackend.getItem(`${storagePrefix}${key}`);
      if (value == null) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      storageBackend.setItem(`${storagePrefix}${key}`, JSON.stringify(value));
    },
  });

  return Object.freeze({
    definition,
    scope,
    time: freezeGroup(time),
    rendering: freezeGroup(rendering),
    surface: freezeGroup(surface),
    input: freezeGroup(input),
    audio: freezeGroup(audio),
    flow: freezeGroup(flow),
    storage,
    random: Object.freeze({ range: randomRange }),
  });
}
