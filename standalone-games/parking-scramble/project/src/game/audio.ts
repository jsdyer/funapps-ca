export class Sfx {
  private ctx: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  muted = false;
  private started = false;

  unlock() {
    if (this.muted) return;
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    this.started = true;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stopEngine();
  }

  private ensure() {
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    return this.ctx;
  }

  private envGain(duration: number, peak: number, freq: number, type: OscillatorType, slide = 0) {
    if (this.muted || !this.started) return;
    const ctx = this.ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  engineSpeed(speed: number, throttle: number) {
    if (this.muted || !this.started) {
      this.stopEngine();
      return;
    }
    const ctx = this.ensure();
    if (!this.engine) {
      this.engine = ctx.createOscillator();
      this.filter = ctx.createBiquadFilter();
      this.engineGain = ctx.createGain();
      this.engine.type = "sawtooth";
      this.filter.type = "lowpass";
      this.filter.frequency.value = 240;
      this.engineGain.gain.value = 0.0001;
      this.engine.connect(this.filter);
      this.filter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);
      this.engine.start();
    }
    const engine = this.engine;
    const gain = this.engineGain;
    if (!engine || !gain) return;
    const sp = Math.abs(speed);
    const freq = 48 + sp * 5.5 + throttle * 12;
    engine.frequency.setTargetAtTime(freq, ctx.currentTime, 0.08);
    const vol = 0.012 + Math.min(0.03, sp * 0.0022) + throttle * 0.008;
    gain.gain.setTargetAtTime(vol, ctx.currentTime, 0.08);
  }

  stopEngine() {
    if (!this.engine) return;
    try {
      this.engine.stop();
    } catch {
      /* already stopped */
    }
    this.engine.disconnect();
    this.filter?.disconnect();
    this.engineGain?.disconnect();
    this.engine = null;
    this.filter = null;
    this.engineGain = null;
  }

  honk() {
    this.envGain(0.18, 0.05, 420, "square", -80);
    this.envGain(0.16, 0.03, 560, "square", -40);
  }

  pickup() {
    this.envGain(0.12, 0.04, 660, "sine", 220);
    this.envGain(0.18, 0.03, 880, "sine", 180);
  }

  hit() {
    this.envGain(0.22, 0.07, 110, "triangle", -70);
    this.envGain(0.08, 0.04, 240, "square", -100);
  }

  scrape() {
    this.envGain(0.09, 0.02, 180, "sawtooth", -40);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      window.setTimeout(() => this.envGain(0.28, 0.04, f, "sine"), i * 90);
    });
  }

  fail() {
    this.envGain(0.4, 0.05, 196, "triangle", -120);
    this.envGain(0.5, 0.03, 140, "sine", -40);
  }

  taken() {
    this.envGain(0.12, 0.03, 300, "square", -60);
  }
}
