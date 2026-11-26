export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private nextNote = 0;
  private step = 0;
  muted = false;
  private droneOn = false;

  unlock() {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: "interactive" });
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      music.gain.value = 0.22;
      sfx.gain.value = 0.9;
      master.gain.value = 1;
      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.music = music;
      this.sfx = sfx;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.ensureDrone();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (!this.master || !this.ctx) return this.muted;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.03);
    return this.muted;
  }

  private ensureDrone() {
    if (!this.ctx || !this.music || this.droneOn) return;
    this.droneOn = true;
    const bed = (freq: number, gain: number, type: OscillatorType) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(this.music!);
      osc.start();
    };
    bed(73.42, 0.05, "sine");
    bed(110, 0.028, "triangle");
    bed(146.83, 0.016, "sine");
  }

  tick(playing: boolean) {
    if (!this.ctx || !this.music || this.muted || !playing) return;
    const notes = [293.66, 349.23, 392, 440, 392, 349.23, 329.63, 293.66];
    if (this.ctx.currentTime >= this.nextNote) {
      const f = notes[this.step % notes.length];
      this.step += 1;
      this.tone(f, 0.34, "triangle", 0.035, this.music);
      if (this.step % 4 === 0) this.tone(f * 2, 0.18, "sine", 0.018, this.music);
      this.nextNote = this.ctx.currentTime + 0.52;
    }
  }

  foot() {
    this.noise(0.045, 0.05, 900);
  }

  jump() {
    if (!this.ctx || !this.sfx) return;
    this.tone(320, 0.12, "square", 0.03, this.sfx, 540);
  }

  land() {
    this.noise(0.08, 0.07, 400);
  }

  berry() {
    if (!this.sfx) return;
    this.tone(660, 0.08, "sine", 0.05, this.sfx);
    this.tone(880, 0.1, "triangle", 0.03, this.sfx);
  }

  token() {
    if (!this.sfx) return;
    this.tone(523, 0.1, "triangle", 0.05, this.sfx);
    this.tone(784, 0.16, "sine", 0.04, this.sfx);
  }

  postcard() {
    if (!this.sfx) return;
    this.tone(392, 0.12, "triangle", 0.04, this.sfx);
    this.tone(587, 0.16, "sine", 0.035, this.sfx);
  }

  hit() {
    if (!this.sfx) return;
    this.tone(110, 0.16, "sawtooth", 0.04, this.sfx, 70);
    this.noise(0.12, 0.08, 300);
  }

  horn() {
    if (!this.sfx) return;
    this.tone(196, 0.45, "sawtooth", 0.04, this.sfx);
    this.tone(247, 0.5, "triangle", 0.035, this.sfx);
  }

  win() {
    if (!this.sfx) return;
    this.tone(392, 0.16, "triangle", 0.05, this.sfx);
    this.tone(523, 0.2, "triangle", 0.05, this.sfx);
    this.tone(659, 0.32, "sine", 0.05, this.sfx);
  }

  lose() {
    if (!this.sfx) return;
    this.tone(311, 0.22, "triangle", 0.04, this.sfx, 196);
    this.tone(233, 0.4, "sine", 0.04, this.sfx, 140);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    bus: GainNode,
    slideTo?: number,
  ) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(bus);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  private noise(dur: number, gain: number, cutoff: number) {
    if (!this.ctx || !this.sfx) return;
    const now = this.ctx.currentTime;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(now);
  }
}
