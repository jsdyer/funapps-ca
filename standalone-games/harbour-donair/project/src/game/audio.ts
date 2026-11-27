type Graph = {
  ctx: AudioContext;
  master: GainNode;
  sfx: GainNode;
};

let graph: Graph | null = null;
let enabled = true;

function ensure(): Graph | null {
  if (graph) return graph;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC({ latencyHint: "interactive" });
  const master = ctx.createGain();
  const sfx = ctx.createGain();
  sfx.gain.value = 0.85;
  master.gain.value = enabled ? 1 : 0;
  sfx.connect(master);
  master.connect(ctx.destination);
  graph = { ctx, master, sfx };
  return graph;
}

export function unlockAudio() {
  const g = ensure();
  if (g && g.ctx.state === "suspended") void g.ctx.resume();
}

export function resumeAudio() {
  if (graph && graph.ctx.state === "suspended") void graph.ctx.resume();
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!graph) return;
  graph.master.gain.setTargetAtTime(on ? 1 : 0, graph.ctx.currentTime, 0.02);
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  peak: number,
  slideTo?: number,
) {
  if (!enabled) return;
  const g = ensure();
  if (!g) return;
  const { ctx, sfx } = g;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(40, freq), t);
  if (slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
  }
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(sfx);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

function noise(dur: number, peak: number, freq: number) {
  if (!enabled) return;
  const g = ensure();
  if (!g) return;
  const { ctx, sfx } = g;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(Math.max(0.0001, peak), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(sfx);
  src.start(t);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

export function sfx(name: string) {
  const wobble = 0.94 + Math.random() * 0.12;
  switch (name) {
    case "slap":
      noise(0.08, 0.32, 240);
      tone(150 * wobble, 0.08, "triangle", 0.18, 80);
      break;
    case "shake":
      noise(0.11, 0.16, 1600);
      tone(720 * wobble, 0.06, "sine", 0.05);
      break;
    case "toss":
      tone(480 * wobble, 0.09, "triangle", 0.12, 740);
      break;
    case "stretch":
      tone(190, 0.08, "sine", 0.04, 250);
      break;
    case "lock":
      tone(310, 0.1, "triangle", 0.16);
      tone(470, 0.16, "sine", 0.1);
      break;
    case "gold":
      tone(660, 0.1, "sine", 0.09);
      tone(880, 0.16, "sine", 0.07);
      break;
    case "pull-good":
      tone(523, 0.1, "triangle", 0.15);
      tone(659, 0.14, "triangle", 0.12);
      tone(784, 0.2, "sine", 0.1);
      break;
    case "pull-bad":
      tone(180, 0.18, "sawtooth", 0.04, 110);
      noise(0.12, 0.1, 180);
      break;
    case "send":
      tone(784, 0.08, "sine", 0.09);
      tone(1046, 0.14, "sine", 0.07);
      break;
    case "perfect":
      tone(523, 0.09, "triangle", 0.13);
      tone(659, 0.11, "triangle", 0.11);
      tone(784, 0.13, "triangle", 0.1);
      tone(1046, 0.22, "sine", 0.09);
      break;
    case "tick":
      tone(720, 0.045, "square", 0.035);
      break;
    case "end":
      tone(392, 0.16, "triangle", 0.11);
      tone(330, 0.2, "triangle", 0.09);
      tone(262, 0.32, "sine", 0.08);
      break;
    case "ui":
      tone(520, 0.05, "sine", 0.06);
      break;
    default:
      break;
  }
}
