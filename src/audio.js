// src/audio.js - Procedural Web Audio API Sound Synthesizer

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Master gain for volume control
let masterGain = null;
function getMaster() {
  const ctx = getCtx();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

export function initAudio() {
  getCtx();
  getMaster();
}

// === KICK SOUND ===
// Low-pass filtered noise burst + pitch-dropping sine
export function playKick() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Noise burst
  const bufferSize = ctx.sampleRate * 0.15;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
  }

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(800, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.12);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.8, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(getMaster());
  noiseSrc.start(now);

  // Pitch-dropping sine (the "thud")
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(0.6, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(oscGain);
  oscGain.connect(getMaster());
  osc.start(now);
  osc.stop(now + 0.15);
}

// === WHISTLE (FM modulated sine with trill) ===
export function playWhistle() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = 2800;

  const modulator = ctx.createOscillator();
  modulator.type = 'sine';
  modulator.frequency.value = 30;

  const modGain = ctx.createGain();
  modGain.gain.value = 400;

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  const outputGain = ctx.createGain();
  outputGain.gain.setValueAtTime(0, now);
  outputGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
  outputGain.gain.setValueAtTime(0.3, now + 0.6);
  outputGain.gain.linearRampToValueAtTime(0, now + 0.8);

  carrier.connect(outputGain);
  outputGain.connect(getMaster());

  carrier.start(now);
  modulator.start(now);
  carrier.stop(now + 0.85);
  modulator.stop(now + 0.85);
}

// === POST/CROSSBAR CLANG ===
export function playPostHit() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Metallic resonance
  const frequencies = [800, 1200, 2400, 3600];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3 / (i + 1), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(now);
    osc.stop(now + 0.45);
  });

  // Impact noise
  const bufSize = ctx.sampleRate * 0.05;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.1));
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  src.connect(filter);
  filter.connect(g);
  g.connect(getMaster());
  src.start(now);
}

// === NET SWISH ===
export function playNetSwish() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const bufSize = ctx.sampleRate * 0.3;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3)) * 0.3;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  src.start(now);
}

// === CROWD ROAR (Goal celebration) ===
export function playCrowdCheer() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const duration = 2.5;

  const bufSize = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const d = buf.getChannelData(0);

  // Multiple layers of "crowd" noise
  for (let i = 0; i < bufSize; i++) {
    const t = i / ctx.sampleRate;
    const envelope = Math.min(t * 4, 1) * Math.exp(-t * 0.8);
    // Mix of noise with some periodic "chants"
    const noise = Math.random() * 2 - 1;
    const chant = Math.sin(2 * Math.PI * 200 * t) * 0.1 * Math.sin(2 * Math.PI * 3 * t);
    d[i] = (noise * 0.7 + chant) * envelope * 0.5;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.6;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  src.start(now);
}

// === CROWD GROAN (Miss) ===
export function playCrowdGroan() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const duration = 1.5;

  const bufSize = ctx.sampleRate * duration;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const d = buf.getChannelData(0);

  for (let i = 0; i < bufSize; i++) {
    const t = i / ctx.sampleRate;
    const envelope = Math.min(t * 3, 1) * Math.exp(-t * 1.5);
    const noise = Math.random() * 2 - 1;
    // Low descending moan
    const moan = Math.sin(2 * Math.PI * (150 - t * 40) * t) * 0.2;
    d[i] = (noise * 0.4 + moan) * envelope * 0.4;
  }

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;

  const gain = ctx.createGain();
  gain.gain.value = 0.5;

  src.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  src.start(now);
}

// === SAVE SOUND ===
export function playSave() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Heavy thud + glove squeak
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(100, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(now);
  osc.stop(now + 0.25);

  // Squeak
  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(2000, now);
  osc2.frequency.exponentialRampToValueAtTime(800, now + 0.08);

  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.15, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc2.connect(g2);
  g2.connect(getMaster());
  osc2.start(now);
  osc2.stop(now + 0.12);
}
