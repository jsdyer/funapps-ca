import type { Sfx } from "./logic";

type Graph = {
  ctx: AudioContext;
  master: GainNode;
  engine: OscillatorNode;
  engineGain: GainNode;
  noise: AudioBuffer;
};

let graph: Graph | null = null;

function ensure(): Graph | null {
  if (typeof window === "undefined") return null;
  if (graph) return graph;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx({ latencyHint: "interactive" });
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  engineGain.connect(master);
  const engine = ctx.createOscillator();
  engine.type = "sawtooth";
  engine.frequency.value = 55;
  engine.connect(filter);
  filter.connect(engineGain);
  engine.start();
  const len = Math.floor(ctx.sampleRate * 0.45);
  const noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 1.4);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  graph = { ctx, master, engine, engineGain, noise };
  return graph;
}

export function unlockAudio() {
  const g = ensure();
  if (!g) return;
  if (g.ctx.state === "suspended") void g.ctx.resume();
}

export function resumeAudio() {
  if (!graph) return;
  if (graph.ctx.state === "suspended") void graph.ctx.resume();
}

export function syncAudio(speed: number, driving: boolean, muted: boolean) {
  const g = graph;
  if (!g) return;
  const now = g.ctx.currentTime;
  g.master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.04);
  const vol = driving ? Math.min(0.07, 0.012 + Math.abs(speed) * 0.008) : 0;
  g.engineGain.gain.setTargetAtTime(vol, now, 0.06);
  g.engine.frequency.setTargetAtTime(46 + Math.abs(speed) * 16, now, 0.05);
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const g = graph;
  if (!g) return;
  const now = g.ctx.currentTime + delay;
  const o = g.ctx.createOscillator();
  const gn = g.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  gn.gain.setValueAtTime(0.0001, now);
  gn.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), now + 0.02);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(gn);
  gn.connect(g.master);
  o.start(now);
  o.stop(now + dur + 0.02);
}

function playGull() {
  const g = graph;
  if (!g) return;
  const now = g.ctx.currentTime;
  const src = g.ctx.createBufferSource();
  src.buffer = g.noise;
  const filter = g.ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1400, now);
  filter.frequency.exponentialRampToValueAtTime(2400, now + 0.18);
  filter.Q.value = 6;
  const gn = g.ctx.createGain();
  gn.gain.setValueAtTime(0.0001, now);
  gn.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  src.connect(filter);
  filter.connect(gn);
  gn.connect(g.master);
  src.start(now);
  src.stop(now + 0.34);
  tone(880, 0.16, "sine", 0.03, 0.05);
}

export function playSfx(list: Sfx[]) {
  if (!graph || list.length === 0) return;
  for (const s of list) {
    if (s === "horn") {
      tone(174, 0.22, "square", 0.07);
      tone(233, 0.18, "square", 0.04, 0.04);
    } else if (s === "thud") {
      tone(90, 0.12, "triangle", 0.1);
    } else if (s === "tick") {
      tone(660, 0.07, "square", 0.04);
    } else if (s === "settle") {
      tone(520, 0.08, "sine", 0.04);
    } else if (s === "win") {
      tone(523, 0.14, "triangle", 0.07);
      tone(659, 0.16, "triangle", 0.07, 0.1);
      tone(784, 0.28, "triangle", 0.07, 0.2);
    } else if (s === "lose") {
      tone(220, 0.22, "sawtooth", 0.05);
      tone(140, 0.4, "triangle", 0.06, 0.12);
    } else if (s === "gull") {
      playGull();
    }
  }
}
