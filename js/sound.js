// Efek suara buatan sendiri dengan Web Audio (tanpa file audio) + getar ringan.
let ctx = null;
let enabled = true;
let haptics = true;

export function configure(opts) {
  if ('sound' in opts) enabled = opts.sound;
  if ('haptics' in opts) haptics = opts.haptics;
}

// iOS hanya mengizinkan audio setelah sentuhan pertama.
export function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
}

function tone(freq, t0, dur, { type = 'sine', gain = 0.18, attack = 0.005, to = null } = {}) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function knock(t0, freq = 1800, gain = 0.35, dur = 0.06) {
  // bunyi kartu beradu: derau pendek tersaring
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 2.5;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t0);
}

const SOUNDS = {
  tile: (t) => { knock(t, 2200, 0.45); tone(880, t, 0.05, { type: 'triangle', gain: 0.05 }); },
  select: (t) => knock(t, 3200, 0.18, 0.03),
  claim: (t) => { knock(t, 1200, 0.5, 0.08); knock(t + 0.07, 1500, 0.4, 0.07); },
  chip: (t) => { for (let i = 0; i < 4; i++) { tone(2400 + i * 180, t + i * 0.07, 0.12, { type: 'triangle', gain: 0.07 }); knock(t + i * 0.07, 5000, 0.12, 0.03); } },
  win: (t) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { tone(f, t + i * 0.11, 0.9, { gain: 0.11 }); tone(f * 2, t + i * 0.11, 0.5, { gain: 0.03 }); }),
  draw: (t) => { tone(392, t, 0.5, { gain: 0.08 }); tone(330, t + 0.18, 0.6, { gain: 0.07 }); },
};

export function play(name) {
  if (!enabled || !ctx || !SOUNDS[name]) return;
  try { SOUNDS[name](ctx.currentTime + 0.01); } catch { /* abaikan */ }
}

// Getar ringan (Android). Safari iOS tidak mendukung navigator.vibrate, jadi diam saja di sana.
export function buzz(ms = 12) {
  if (haptics && navigator.vibrate) try { navigator.vibrate(ms); } catch { /* abaikan */ }
}
