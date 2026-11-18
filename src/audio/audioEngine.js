// Procedural audio for the demo. Nothing to download: every sound
// (sample loop, ambient noise, UI clicks) is synthesized with Web Audio.
//
// Signal flow:
//   sample  -> musicBus -> analyser -> master -> speakers   (analyser drives the visuals)
//   ambient -> ambientFilter -> ambientBus -> master
//   ui      -> uiBus -> master

let ctx = null;
let master, uiBus, musicBus, analyser, ambientBus, ambientFilter;
let whiteBuf, brownBuf, freqData;

let timer = null;
let nextTime = 0;
let stepIndex = 0;
let ambient = null;
let ambientStopTimer = null;
let lastUi = 0;

// ---------- tiny store so React can subscribe (useSyncExternalStore) ----------

let snapshot = { playing: false, anc: 'off', uiSounds: true };
const listeners = new Set();

function set(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getSnapshot() {
  return snapshot;
}

// ---------- setup ----------

function makeNoise(seconds, type) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (type === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  } else {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

// Must be called from a user gesture the first time (browser autoplay rules).
function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 10;
    limiter.ratio.value = 8;
    limiter.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(limiter);

    uiBus = ctx.createGain();
    uiBus.gain.value = 0.5;
    uiBus.connect(master);

    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.75;
    analyser.connect(master);
    freqData = new Uint8Array(analyser.frequencyBinCount);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.85;
    musicBus.connect(analyser);

    ambientFilter = ctx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.value = 8000;
    ambientBus = ctx.createGain();
    ambientBus.gain.value = 0;
    ambientFilter.connect(ambientBus);
    ambientBus.connect(master);

    whiteBuf = makeNoise(2, 'white');
    brownBuf = makeNoise(4, 'brown');
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ---------- instruments ----------

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Percussive amplitude envelope.
function env(param, t, peak, attack, decay) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(peak, t + attack);
  param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseHit(t, dur, { type, freq, q = 0.7, gain, bus }) {
  const src = ctx.createBufferSource();
  src.buffer = whiteBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  env(g.gain, t, gain, 0.002, dur);
  src.connect(f);
  f.connect(g);
  g.connect(bus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

function tone(t, dur, { type = 'sine', freq, gain, bus, filter, glideTo }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + Math.min(dur, 0.15));
  const g = ctx.createGain();
  env(g.gain, t, gain, 0.004, dur);
  let node = o;
  if (filter) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    o.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(bus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const kick = (t) => tone(t, 0.32, { freq: 150, glideTo: 42, gain: 1, bus: musicBus });

function snare(t) {
  noiseHit(t, 0.18, { type: 'bandpass', freq: 1900, q: 0.8, gain: 0.45, bus: musicBus });
  tone(t, 0.1, { type: 'triangle', freq: 190, gain: 0.25, bus: musicBus });
}

const hat = (t, vel) =>
  noiseHit(t, 0.045, { type: 'highpass', freq: 7500, gain: vel, bus: musicBus });

const bass = (t, n, dur) =>
  tone(t, dur, { type: 'sawtooth', freq: midi(n), gain: 0.35, bus: musicBus, filter: 420 });

const pluck = (t, n) =>
  tone(t, 0.22, { type: 'triangle', freq: midi(n + 12), gain: 0.12, bus: musicBus, filter: 2400 });

function pad(t, notes, dur) {
  notes.forEach((n, i) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = midi(n);
    o.detune.value = (i - 1) * 6;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
}

// ---------- the sample loop: 92 BPM, Am - F - C - G ----------

const STEP = 60 / 92 / 4; // one 16th note
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];
const BASS = [33, 29, 36, 31];

function playStep(s, t) {
  const bar = Math.floor(s / 16) % 4;
  const i = s % 16;
  const chord = CHORDS[bar];

  if (i === 0 || i === 6 || i === 10) kick(t);
  if (i === 4 || i === 12) snare(t);
  hat(t, i % 4 === 2 ? 0.16 : i % 2 === 0 ? 0.09 : 0.045);
  if (i === 0 || i === 3 || i === 8 || i === 11) bass(t, BASS[bar], STEP * 2.5);
  if (i === 0) pad(t, chord, STEP * 16);
  if ([2, 5, 7, 9, 13, 15].includes(i)) pluck(t, chord[(i >> 1) % chord.length]);
}

// Look-ahead scheduler: stays in time even if the JS thread hiccups.
function schedule() {
  while (nextTime < ctx.currentTime + 0.15) {
    playStep(stepIndex, nextTime);
    nextTime += STEP;
    stepIndex = (stepIndex + 1) % 64;
  }
}

function startSample() {
  if (!ensure()) return;
  const now = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(now);
  musicBus.gain.setTargetAtTime(0.85, now, 0.02);
  nextTime = now + 0.06;
  stepIndex = 0;
  clearInterval(timer);
  timer = setInterval(schedule, 25);
  set({ playing: true });
}

function stopSample() {
  clearInterval(timer);
  timer = null;
  if (ctx) {
    const now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setTargetAtTime(0, now, 0.07);
  }
  set({ playing: false });
}

export function togglePlay() {
  if (snapshot.playing) stopSample();
  else startSample();
}

// Background timers get throttled in hidden tabs, which would stutter the loop.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && snapshot.playing) stopSample();
  });
}

// ---------- noise-cancelling demo ----------

function startAmbient() {
  if (ambient || !ensure()) return;

  // low traffic / room rumble
  const rumble = ctx.createBufferSource();
  rumble.buffer = brownBuf;
  rumble.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 420;
  const rg = ctx.createGain();
  rg.gain.value = 0.9;
  rumble.connect(lp);
  lp.connect(rg);
  rg.connect(ambientFilter);

  // murmuring chatter: band-passed noise with a slow wobble
  const chat = ctx.createBufferSource();
  chat.buffer = whiteBuf;
  chat.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1100;
  bp.Q.value = 0.8;
  const cg = ctx.createGain();
  cg.gain.value = 0.07;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 3.3;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.05;
  lfo.connect(lfoDepth);
  lfoDepth.connect(cg.gain);
  chat.connect(bp);
  bp.connect(cg);
  cg.connect(ambientFilter);

  rumble.start();
  chat.start();
  lfo.start();
  ambient = [rumble, chat, lfo];
}

function stopAmbientNodes() {
  (ambient || []).forEach((n) => {
    try {
      n.stop();
    } catch {
      /* already stopped */
    }
  });
  ambient = null;
}

// mode: 'off' | 'noisy' | 'cancelled'
export function setAnc(mode) {
  if (mode === 'off') {
    if (ctx) ambientBus.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    clearTimeout(ambientStopTimer);
    ambientStopTimer = setTimeout(() => {
      if (snapshot.anc === 'off') stopAmbientNodes();
    }, 800);
    set({ anc: 'off' });
    return;
  }
  if (!ensure()) return;
  clearTimeout(ambientStopTimer);
  startAmbient();

  const on = mode === 'cancelled';
  const now = ctx.currentTime;
  ambientBus.gain.cancelScheduledValues(now);
  ambientBus.gain.setTargetAtTime(on ? 0.03 : 0.5, now, on ? 0.35 : 0.15);
  ambientFilter.frequency.cancelScheduledValues(now);
  ambientFilter.frequency.setTargetAtTime(on ? 260 : 8000, now, 0.3);
  set({ anc: mode });
}

// ---------- UI sounds ----------

export function setUiSounds(on) {
  set({ uiSounds: on });
}

function click(t, freq, vol = 0.28) {
  tone(t, 0.07, { freq, glideTo: freq * 0.6, gain: vol, bus: uiBus });
}

function whoosh(t, f0, f1, dur) {
  const src = ctx.createBufferSource();
  src.buffer = whiteBuf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + dur * 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp);
  bp.connect(g);
  g.connect(uiBus);
  src.start(t, Math.random());
  src.stop(t + dur + 0.05);
}

// kind: 'click' | 'whoosh-out' (disassemble) | 'whoosh-in' (reassemble)
export function playUi(kind) {
  if (!snapshot.uiSounds) return;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (nowMs - lastUi < 70) return;
  lastUi = nowMs;
  if (!ensure()) return;

  const t = ctx.currentTime + 0.005;
  if (kind === 'click') click(t, 1500);
  else if (kind === 'whoosh-out') whoosh(t, 350, 2800, 0.5);
  else if (kind === 'whoosh-in') {
    whoosh(t, 2800, 350, 0.45);
    click(t + 0.42, 520, 0.35);
  }
}

// ---------- levels for the visuals (read every frame, no React state) ----------

export function getLevels() {
  if (!analyser || !snapshot.playing) return { bass: 0, level: 0 };
  analyser.getByteFrequencyData(freqData);
  let b = 0;
  for (let i = 0; i < 3; i++) b += freqData[i];
  b /= 3 * 255;
  let l = 0;
  for (let i = 0; i < 64; i++) l += freqData[i];
  l /= 64 * 255;
  return { bass: Math.pow(b, 1.6), level: l };
}
