export type SeaAudio = {
  unlock: () => void;
  setMuted: (muted: boolean) => void;
  setEngine: (amount: number) => void;
  haul: () => void;
  pop: (kind: "good" | "gold" | "soft") => void;
  splash: () => void;
  bell: () => void;
  honk: () => void;
  gull: () => void;
  coin: () => void;
  destroy: () => void;
};

export function createAudio(): SeaAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let engineGain: GainNode | null = null;
  let muted = false;
  let alive = true;

  function context(): AudioContext | null {
    if (!alive) return null;
    if (ctx) return ctx;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    master.connect(ctx.destination);

    const seconds = 2;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      brown = brown * 0.985 + white * 0.015;
      data[i] = brown * 5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    src.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    src.start();
    return ctx;
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0, delay = 0) {
    const audio = context();
    if (!audio || !master || muted) return;
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    }
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function noise(dur: number, gain: number) {
    const audio = context();
    if (!audio || !master || muted) return;
    const length = Math.max(1, Math.floor(audio.sampleRate * dur));
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const amp = audio.createGain();
    amp.gain.value = gain;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start();
  }

  return {
    unlock() {
      const audio = context();
      if (audio && audio.state === "suspended") void audio.resume();
    },
    setMuted(next) {
      muted = next;
      const audio = ctx;
      if (audio && master) master.gain.setTargetAtTime(next ? 0 : 0.85, audio.currentTime, 0.04);
      if (next && audio && engineGain) engineGain.gain.setTargetAtTime(0, audio.currentTime, 0.05);
    },
    setEngine(amount) {
      if (!engineGain || !ctx) return;
      const value = muted ? 0 : Math.max(0, Math.min(1, amount)) * 0.2;
      engineGain.gain.setTargetAtTime(value, ctx.currentTime, 0.08);
    },
    haul() {
      tone(160, 0.55, "sawtooth", 0.045, 260);
    },
    pop(kind) {
      if (kind === "gold") {
        tone(523, 0.12, "triangle", 0.08);
        tone(784, 0.2, "triangle", 0.06, 0, 0.07);
      } else if (kind === "soft") {
        tone(196, 0.16, "sine", 0.04);
      } else {
        tone(440, 0.1, "triangle", 0.07);
        tone(660, 0.16, "sine", 0.05, 0, 0.06);
      }
    },
    splash() {
      noise(0.22, 0.18);
    },
    bell() {
      tone(659, 0.38, "triangle", 0.07);
      tone(880, 0.5, "triangle", 0.06, 0, 0.16);
    },
    honk() {
      tone(130, 0.16, "square", 0.035);
    },
    gull() {
      tone(1480, 0.11, "sine", 0.028, 380);
      tone(1760, 0.1, "sine", 0.022, -420, 0.12);
    },
    coin() {
      tone(880, 0.1, "triangle", 0.06);
      tone(1318, 0.2, "triangle", 0.05, 0, 0.08);
    },
    destroy() {
      alive = false;
      void ctx?.close();
      ctx = null;
    },
  };
}
