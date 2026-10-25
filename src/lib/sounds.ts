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

/** Old paper turning: a slow, muffled low sweep and a soft settle. Cosy, never crisp. */
export function pageTurn() {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime, dur = 0.6 + Math.random() * 0.25;
  const sweep = noise(c, dur), lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.4;
  lp.frequency.setValueAtTime(500 + Math.random() * 150, t0);
  lp.frequency.linearRampToValueAtTime(950 + Math.random() * 200, t0 + dur * 0.45);
  lp.frequency.linearRampToValueAtTime(300, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.045, t0 + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  sweep.connect(lp).connect(g).connect(c.destination); sweep.start(t0);
  // the page settling flat, soft and heavy
  const thump = noise(c, 0.09), lp2 = c.createBiquadFilter();
  lp2.type = "lowpass"; lp2.frequency.value = 260;
  thump.connect(lp2).connect(env(c, 0.07, 0.008, 0.09, t0 + dur * 0.85)); thump.start(t0 + dur * 0.85);
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
