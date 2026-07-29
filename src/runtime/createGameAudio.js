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
} = {}) {
  function play(name, delayMs = 0) {
    const sound = sounds[name];
    if (!sound) return;
    if (delayMs > 0) schedule(sound, delayMs);
    else sound();
  }

  const experience = Object.freeze({
    playSound: play,
    resume: sounds.resume,
  });
  const combat = Object.freeze({
    playSound: play,
    playPunch: sounds.punch,
    playHit: sounds.hit,
    playMiss: sounds.miss,
  });
  const settlement = Object.freeze({
    playWin: sounds.win,
    playLose: sounds.lose,
  });

  return Object.freeze({
    play,
    punch: sounds.punch,
    hit: sounds.hit,
    miss: sounds.miss,
    win: sounds.win,
    lose: sounds.lose,
    resume: sounds.resume,
    experience,
    combat,
    settlement,
  });
}
