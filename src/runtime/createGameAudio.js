import {
  resumeAudioOnInteraction,
  sfxHit,
  sfxLose,
  sfxMiss,
  sfxNpcHit,
  sfxPunch,
  sfxThunder,
  sfxWin,
  sfxWolfPunch,
} from "../systems/AudioSystem.js";

const defaultSounds = Object.freeze({
  hit: sfxHit,
  lose: sfxLose,
  miss: sfxMiss,
  npcHit: sfxNpcHit,
  punch: sfxPunch,
  resume: resumeAudioOnInteraction,
  thunder: sfxThunder,
  win: sfxWin,
  wolfPunch: sfxWolfPunch,
});

export function createGameAudio({
  sounds = defaultSounds,
  schedule = (play, delayMs) => setTimeout(play, delayMs),
  isEnabled = () => true,
} = {}) {
  function gated(sound) {
    if (!sound) return () => {};
    return (...args) => {
      if (isEnabled() === false) return;
      sound(...args);
    };
  }

  const hit = gated(sounds.hit);
  const miss = gated(sounds.miss);
  const punch = gated(sounds.punch);
  const win = gated(sounds.win);
  const lose = gated(sounds.lose);

  function play(name, delayMs = 0) {
    const sound = sounds[name];
    if (!sound) return;
    const run = () => {
      if (isEnabled() === false) return;
      sound();
    };
    if (delayMs > 0) schedule(run, delayMs);
    else run();
  }

  const experience = Object.freeze({
    playSound: play,
    resume: sounds.resume,
  });
  const combat = Object.freeze({
    playSound: play,
    playPunch: punch,
    playHit: hit,
    playMiss: miss,
  });
  const settlement = Object.freeze({
    playWin: win,
    playLose: lose,
  });

  return Object.freeze({
    play,
    punch,
    hit,
    miss,
    win,
    lose,
    resume: sounds.resume,
    experience,
    combat,
    settlement,
  });
}
