/** Tiny synth alley. Unlocked from the first tap. No asset files. */

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
  noise: AudioBuffer;
  rollGain: GainNode | null;
  rollSrc: AudioBufferSourceNode | null;
};

let graph: Graph | null = null;
let muted = false;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!graph) {
    const ctx = new Ctx({ latencyHint: "interactive" });
    const master = ctx.createGain();
    const sfx = ctx.createGain();
    master.gain.value = 0.9;
    sfx.gain.value = 0.9;
    sfx.connect(master);
    master.connect(ctx.destination);
    const seconds = 1;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x1a2b;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807 + 11) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    graph = { ctx, master, sfx, noise: buffer, rollGain: null, rollSrc: null };
  }
  return graph.ctx;
}

export function unlockAudio(): void {
  const ctx = context();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (!graph) return;
  const now = graph.ctx.currentTime;
  graph.master.gain.setTargetAtTime(next ? 0 : 0.9, now, 0.02);
}

export function resumeIfNeeded(): void {
  if (!graph) return;
  if (graph.ctx.state === "suspended") void graph.ctx.resume();
}

function envGain(at: number, peak: number, dur: number): GainNode | null {
  if (!graph || muted) return null;
  const gain = graph.ctx.createGain();
  gain.connect(graph.sfx);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  return gain;
}

export function playClack(power: number): void {
  const ctx = context();
  if (!ctx || !graph || muted) return;
  const now = ctx.currentTime;
  const peak = 0.12 + power * 0.22;
  const dur = 0.09 + power * 0.06;
  const body = envGain(now, peak, dur);
  if (!body) return;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  const freq = 180 + power * 220 + (now % 1) * 40;
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + dur);
  osc.connect(body);
  osc.start(now);
  osc.stop(now + dur + 0.02);

  const tick = envGain(now, peak * 0.55, 0.045);
  if (!tick) return;
  const src = ctx.createBufferSource();
  src.buffer = graph.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 900 + power * 1400;
  filter.Q.value = 0.7;
  src.connect(filter);
  filter.connect(tick);
  src.start(now);
  src.stop(now + 0.05);
}

export function playGutter(): void {
  const ctx = context();
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  const gain = envGain(now, 0.2, 0.28);
  if (!gain) return;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(48, now + 0.26);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function playStrike(): void {
  const ctx = context();
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  [196, 247, 330].forEach((freq, i) => {
    const at = now + i * 0.07;
    const gain = envGain(at, 0.12, 0.22);
    if (!gain) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + 0.24);
  });
}

export function playSpare(): void {
  const ctx = context();
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  [262, 392].forEach((freq, i) => {
    const at = now + i * 0.06;
    const gain = envGain(at, 0.1, 0.18);
    if (!gain) return;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + 0.2);
  });
}

export function startRoll(): void {
  const ctx = context();
  if (!ctx || !graph || muted) return;
  stopRoll();
  const src = ctx.createBufferSource();
  src.buffer = graph.noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.08);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(graph.sfx);
  src.start();
  graph.rollSrc = src;
  graph.rollGain = gain;
}

export function stopRoll(): void {
  if (!graph?.rollGain || !graph.rollSrc) return;
  const now = graph.ctx.currentTime;
  graph.rollGain.gain.setTargetAtTime(0.0001, now, 0.05);
  const src = graph.rollSrc;
  graph.rollSrc = null;
  graph.rollGain = null;
  window.setTimeout(() => {
    try {
      src.stop();
    } catch {
      /* already stopped */
    }
  }, 180);
}

export function playClick(): void {
  const ctx = context();
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  const gain = envGain(now, 0.06, 0.05);
  if (!gain) return;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = 540;
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.06);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeIfNeeded();
  });
}
