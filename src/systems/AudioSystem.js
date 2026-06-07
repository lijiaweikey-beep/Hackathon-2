let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playTone(freq, duration, type, volume, detune) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (detune) osc.detune.setValueAtTime(detune, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume || 0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNoise(duration, volume) {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume || 0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
  src.stop(audioCtx.currentTime + duration);
}

export function sfxPunch() {
  ensureAudio();
  playNoise(0.07, 0.22);
  playTone(150, 0.1, "sawtooth", 0.28);
  playTone(80, 0.14, "sine", 0.16, -180);
}

export function sfxPunchHeavy() {
  ensureAudio();
  playNoise(0.11, 0.38);
  playTone(110, 0.16, "square", 0.34);
  playTone(55, 0.22, "sawtooth", 0.22);
  setTimeout(() => playTone(200, 0.08, "sine", 0.12), 40);
}

export function sfxHurt() {
  ensureAudio();
  playTone(180, 0.18, "sawtooth", 0.28);
  playNoise(0.14, 0.28);
  setTimeout(() => playTone(90, 0.2, "sine", 0.2), 70);
}

export function sfxHit() {
  ensureAudio();
  playTone(260, 0.15, "square", 0.25);
  playTone(520, 0.12, "sine", 0.18);
  playNoise(0.12, 0.2);
  setTimeout(() => playTone(380, 0.1, "sine", 0.15), 60);
}

export function sfxWolfPunch() {
  ensureAudio();
  playNoise(0.06, 0.2);
  playTone(120, 0.08, "sawtooth", 0.18, -120);
  playTone(420, 0.05, "square", 0.12);
}

export function sfxWolfHowl() {
  ensureAudio();
  playTone(96, 0.5, "sawtooth", 0.14, -80);
  setTimeout(() => playTone(144, 0.42, "sine", 0.12, -40), 120);
}

export function sfxThunder() {
  ensureAudio();
  playTone(42, 0.55, "sawtooth", 0.22);
  playNoise(0.52, 0.28);
  setTimeout(() => playTone(58, 0.36, "triangle", 0.15), 90);
}

export function sfxMiss() {
  ensureAudio();
  playTone(120, 0.22, "sawtooth", 0.15);
  playTone(80, 0.3, "sine", 0.1);
}

export function sfxNpcHit() {
  ensureAudio();
  playTone(90, 0.18, "square", 0.18);
  playTone(760, 0.08, "sine", 0.08);
  playNoise(0.1, 0.18);
}

export function sfxWin() {
  ensureAudio();
  [0, 100, 200, 350].forEach((delay, i) => {
    setTimeout(() => playTone([523, 659, 784, 1047][i], 0.25, "sine", 0.2), delay);
  });
}

export function sfxLose() {
  ensureAudio();
  [0, 150, 300].forEach((delay, i) => {
    setTimeout(() => playTone([330, 262, 196][i], 0.35, "sine", 0.18), delay);
  });
}

export function resumeAudioOnInteraction() {
  ensureAudio();
}
