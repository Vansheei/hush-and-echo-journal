// Tiny synthesized sounds (no audio files). Respect the Settings switch.
import { getAppearance } from "./appearance";

let ctx: AudioContext | null = null;
function ac() {
  if (!getAppearance().sounds || typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function noise(c: AudioContext, sec: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * sec), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(); s.buffer = b; return s;
}
function env(c: AudioContext, peak: number, attack: number, decay: number, at = c.currentTime) {
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  g.connect(c.destination); return g;
}

/** Old paper turning: a soft air sweep plus dry crackles, randomised so every turn sounds a little different. */
export function pageTurn() {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime, dur = 0.42 + Math.random() * 0.18;
  const sweep = noise(c, dur), bp = c.createBiquadFilter();
  bp.type = "bandpass"; bp.Q.value = 0.6;
  bp.frequency.setValueAtTime(900 + Math.random() * 300, t0);
  bp.frequency.linearRampToValueAtTime(3200 + Math.random() * 800, t0 + dur * 0.55);
  bp.frequency.linearRampToValueAtTime(1200, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.05, t0 + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.09, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  sweep.connect(bp).connect(g).connect(c.destination); sweep.start(t0);
  // crackles of stiff, aged paper
  const n = 14 + Math.floor(Math.random() * 10);
  for (let i = 0; i < n; i++) {
    const at = t0 + Math.random() * dur * 0.9;
    const k = noise(c, 0.012), hp = c.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 2500 + Math.random() * 3000;
    k.connect(hp).connect(env(c, 0.04 + Math.random() * 0.1, 0.001, 0.008 + Math.random() * 0.012, at)); k.start(at);
  }
  // the page settling flat
  const thump = noise(c, 0.06), lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 500;
  thump.connect(lp).connect(env(c, 0.12, 0.004, 0.06, t0 + dur * 0.92)); thump.start(t0 + dur * 0.92);
}
export function cassetteClick() {
  const c = ac(); if (!c) return;
  for (const [t, p] of [[0, 0.25], [0.07, 0.18]] as const) {
    const n = noise(c, 0.03), f = c.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 2500;
    n.connect(f).connect(env(c, p, 0.001, 0.025, c.currentTime + t)); n.start(c.currentTime + t);
  }
}
export function lockSound() {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(180, c.currentTime); o.frequency.exponentialRampToValueAtTime(90, c.currentTime + 0.2);
  o.connect(env(c, 0.12, 0.005, 0.25)); o.start(); o.stop(c.currentTime + 0.3);
}
