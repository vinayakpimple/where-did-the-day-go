/**
 * Tiny synthesized sound effects — no audio files. A single module-scope
 * AudioContext that is only ever created inside a user-gesture handler, so
 * autoplay is structurally impossible. Default is OFF; the preference lives in
 * localStorage and is read lazily to stay SSR-safe.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = false;

const PREF_KEY = "wdtdg.sound.v1";

export function loadPref(): boolean {
  try {
    enabled = localStorage.getItem(PREF_KEY) === "on";
  } catch { enabled = false; }
  return enabled;
}

/** Call from a click handler only. */
export function setEnabled(v: boolean): void {
  enabled = v;
  try { localStorage.setItem(PREF_KEY, v ? "on" : "off"); } catch {}
  if (v) ensureCtx(); // we are inside a user gesture — safe to create/resume
}

export function isEnabled(): boolean {
  return enabled;
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.25;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = "sine", peak = 1) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(peak, ctx.currentTime + at);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur);
  osc.connect(gain).connect(master);
  osc.start(ctx.currentTime + at);
  osc.stop(ctx.currentTime + at + dur + 0.02);
}

/** Short click — wrong answer, small UI ticks. */
export function tick(): void {
  if (!enabled || !ensureCtx()) return;
  tone(1800, 0, 0.03, "square", 0.5);
}

/** Bright bell fifth — correct answer. */
export function ding(): void {
  if (!enabled || !ensureCtx()) return;
  tone(880, 0, 0.45);
  tone(1320, 0, 0.45, "sine", 0.6);
}

/** Filtered noise sweep — plane takeoff. */
export function whoosh(): void {
  if (!enabled || !ensureCtx() || !ctx || !master) return;
  const dur = 0.5;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(300, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + dur * 0.6);
  filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.7, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start();
}

/** Rising C-major fanfare — star earned. */
export function fanfare(): void {
  if (!enabled || !ensureCtx()) return;
  tone(523.25, 0, 0.15, "triangle");
  tone(659.25, 0.12, 0.15, "triangle");
  tone(783.99, 0.24, 0.15, "triangle");
  tone(1046.5, 0.36, 0.6, "triangle");
}
