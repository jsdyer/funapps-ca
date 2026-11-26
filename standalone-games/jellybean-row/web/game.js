"use strict";
(() => {
  // src/game/audio.ts
  function AudioContextCtor() {
    if (typeof window === "undefined") return null;
    const w = window;
    return w.AudioContext ?? w.webkitAudioContext ?? null;
  }
  var Sfx = class {
    ctx = null;
    master = null;
    muted = false;
    unlock() {
      const Ctor = AudioContextCtor();
      if (!Ctor) return;
      if (!this.ctx) {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.7;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    }
    resume() {
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    }
    setMuted(muted) {
      this.muted = muted;
      if (!this.ctx || !this.master) return;
      this.master.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.02);
    }
    ok() {
      this.tone(523.25, 0.09, "triangle", 0.18, 0);
      this.tone(659.25, 0.12, "triangle", 0.16, 0.07);
    }
    bad() {
      this.noise(0.12, 0.12);
      this.tone(146, 0.16, "sine", 0.12, 0);
    }
    row() {
      [392, 493.88, 587.33, 784].forEach((freq, i) => {
        this.tone(freq, 0.14, "triangle", 0.14, i * 0.07);
      });
    }
    horn() {
      this.tone(98, 0.55, "sawtooth", 0.06, 0);
      this.tone(73, 0.7, "sine", 0.08, 0.02);
    }
    tick() {
      this.tone(880, 0.045, "square", 0.04, 0);
    }
    tone(freq, dur, type, gain, delay) {
      if (!this.ctx || !this.master || this.muted) return;
      const t = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      amp.gain.setValueAtTime(1e-4, t);
      amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
      amp.gain.exponentialRampToValueAtTime(1e-4, t + dur);
      osc.connect(amp);
      amp.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      osc.onended = () => {
        osc.disconnect();
        amp.disconnect();
      };
    }
    noise(dur, gain) {
      if (!this.ctx || !this.master || this.muted) return;
      const length = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const amp = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 420;
      amp.gain.value = gain;
      src.connect(filter);
      filter.connect(amp);
      amp.connect(this.master);
      src.start();
      src.onended = () => {
        src.disconnect();
        filter.disconnect();
        amp.disconnect();
      };
    }
  };

  // src/game/paints.ts
  var PAINTS = [
    { id: "bakeapple", name: "Bakeapple", hex: "#E6A01D" },
    { id: "dory", name: "Dory Red", hex: "#E24B3B" },
    { id: "harbour", name: "Harbour", hex: "#1C8A84" },
    { id: "saltbox", name: "Saltbox", hex: "#3E8C45" },
    { id: "blueberry", name: "Blueberry", hex: "#3C4EBF" },
    { id: "berry", name: "Partridgeberry", hex: "#C4476C" }
  ];
  var HOUSE_COUNT = 5;
  var STREETS = [
    "Gower Street",
    "Duckworth Street",
    "Bond Street",
    "Prescott Street",
    "Victoria Street",
    "Military Road",
    "Cathedral Street",
    "Temperance Street",
    "The Battery",
    "Signal Hill Road"
  ];
  var BY_ID = new Map(PAINTS.map((paint) => [paint.id, paint]));
  function paintById(id) {
    return BY_ID.get(id);
  }
  function inkFor(hex) {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1e3 > 160 ? "#1A2A30" : "#F6F0E6";
  }
  var POSTER = ["dory", "bakeapple", "harbour", "blueberry", "berry"];

  // src/game/draw.ts
  var WEATHERED = "#C9C2B4";
  var TRIM = "#F7F1E6";
  var ROOF = "#2E3438";
  var INK = "#1A2A30";
  function drawStreet(ctx, w, h, state, t, insets, specks, floaters, reduced) {
    const fog = state.phase === "over" ? 0.72 : state.phase === "title" ? 0.06 : 0.08 + (1 - Math.min(1, state.timeLeft / 72)) * 0.42;
    sky(ctx, w, h, t, reduced);
    headland(ctx, w, h, insets);
    water(ctx, w, h, t, insets, reduced);
    const boxes = houses(ctx, w, h, state, t, insets, reduced);
    fogVeil(ctx, w, h, fog, t, reduced);
    specksDraw(ctx, specks);
    floatersDraw(ctx, floaters);
    return boxes;
  }
  function sky(ctx, w, h, t, reduced) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#7EB4C4");
    g.addColorStop(0.42, "#F0D2AE");
    g.addColorStop(0.72, "#F6E4C8");
    g.addColorStop(1, "#E7D3B4");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const sunY = h * 0.28 + (reduced ? 0 : Math.sin(t * 0.25) * 4);
    const sun = ctx.createRadialGradient(w * 0.18, sunY, 8, w * 0.18, sunY, w * 0.28);
    sun.addColorStop(0, "rgba(255, 236, 196, 0.95)");
    sun.addColorStop(0.35, "rgba(255, 196, 120, 0.35)");
    sun.addColorStop(1, "rgba(255, 196, 120, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    blob(ctx, w * 0.62, h * 0.16, 70, 18, t);
    blob(ctx, w * 0.74, h * 0.2, 110, 22, t + 2);
    blob(ctx, w * 0.48, h * 0.12, 80, 14, t + 4);
  }
  function blob(ctx, x, y, rx, ry, t) {
    ctx.beginPath();
    ctx.ellipse(x + Math.sin(t * 0.15) * 8, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function headland(ctx, w, h, insets) {
    const base = insets.top + (h - insets.top - insets.bottom) * 0.46;
    ctx.fillStyle = "#8EAAA8";
    ctx.beginPath();
    ctx.moveTo(0, base + 30);
    ctx.quadraticCurveTo(w * 0.25, base - 20, w * 0.48, base + 10);
    ctx.quadraticCurveTo(w * 0.68, base + 36, w, base - 8);
    ctx.lineTo(w, base + 80);
    ctx.lineTo(0, base + 80);
    ctx.fill();
    ctx.fillStyle = "#6E908C";
    ctx.beginPath();
    ctx.moveTo(w * 0.62, base + 18);
    ctx.lineTo(w * 0.78, base - 36);
    ctx.lineTo(w * 0.96, base + 8);
    ctx.lineTo(w * 0.7, base + 28);
    ctx.fill();
    const tx = w * 0.8;
    const ty = base - 36;
    ctx.fillStyle = "#D9D1C3";
    ctx.fillRect(tx - 7, ty - 28, 14, 30);
    ctx.fillStyle = "#C4B8A6";
    ctx.fillRect(tx - 9, ty - 32, 18, 5);
    ctx.fillStyle = "#EFE8DC";
    ctx.fillRect(tx - 4, ty - 40, 8, 9);
    ctx.fillStyle = INK;
    ctx.fillRect(tx - 0.6, ty - 52, 1.4, 14);
  }
  function water(ctx, w, h, t, insets, reduced) {
    const y = insets.top + (h - insets.top - insets.bottom) * 0.58;
    const g = ctx.createLinearGradient(0, y, 0, h);
    g.addColorStop(0, "#2A8E93");
    g.addColorStop(1, "#165860");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, h - y);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const yy = y + 18 + i * 16;
      for (let x = 0; x <= w; x += 12) {
        const wave = reduced ? 0 : Math.sin(x * 0.03 + t * 1.4 + i) * 3;
        if (x === 0) ctx.moveTo(x, yy + wave);
        else ctx.lineTo(x, yy + wave);
      }
      ctx.stroke();
    }
    dory(ctx, w * 0.16, y + 36, t, reduced);
  }
  function dory(ctx, x, y, t, reduced) {
    const bob = reduced ? 0 : Math.sin(t * 1.3) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "#E24B3B";
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(0, 12, 26, 0);
    ctx.quadraticCurveTo(0, 6, -22, 0);
    ctx.fill();
    ctx.fillStyle = "#F4E7D2";
    ctx.fillRect(-2, -16, 3, 16);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(1, -16);
    ctx.lineTo(16, -6);
    ctx.lineTo(1, -4);
    ctx.fill();
    ctx.restore();
  }
  function houses(ctx, w, h, state, t, insets, reduced) {
    const poster = state.phase !== "play";
    const bandTop = poster ? Math.max(insets.top, 58) : insets.top + 8;
    const bandBot = poster ? h * 0.56 : h - insets.bottom - 8;
    const bandH = Math.max(120, bandBot - bandTop);
    const avail = Math.min(w * 0.94, 980);
    const hw = avail / 4.72;
    const step = hw * 0.9;
    const total = step * 4 + hw;
    const x0 = (w - total) / 2;
    const rise = Math.min(bandH * 0.22, 78);
    const base = bandTop + bandH * 0.84;
    const boxes = [];
    street(ctx, x0 - 16, base + 8, total + 36, rise);
    for (let i = 0; i < state.houses.length; i++) {
      const house = state.houses[i];
      const x = x0 + i * step;
      const baseline = base - i / 4 * rise;
      const color = houseColor(house, state.phase, i);
      const hh = hw * 1.42;
      drawHouse(ctx, x, baseline, hw, hh, color, house.variant, t, reduced, house.locked && !!house.target);
      const chip = house.target && state.phase === "play" && !house.locked;
      const chipX = x + hw * 0.5;
      let chipY = baseline - hh - hw * 0.62;
      if (chip && house.target) {
        const bob = reduced ? 0 : Math.sin(t * 3 + i) * 4;
        chipY += bob;
        jellybean(ctx, chipX, chipY, paintById(house.target).hex, hw / 78);
      }
      boxes.push({ index: i, x, y: baseline - hh, w: hw, h: hh + 16, chipX, chipY });
    }
    if (!reduced) gull(ctx, w, bandTop, t);
    return boxes;
  }
  function houseColor(house, phase, index) {
    if (phase === "title") return paintById(POSTER[index] ?? "dory").hex;
    if (house.wrongT > 0 && house.flash) return paintById(house.flash).hex;
    if (house.target && house.locked) return paintById(house.target).hex;
    if (house.target) return WEATHERED;
    return paintById(house.scenery).hex;
  }
  function street(ctx, x, y, width, rise) {
    ctx.fillStyle = "#6E6258";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y - rise);
    ctx.lineTo(x + width, y - rise + 28);
    ctx.lineTo(x, y + 22);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 4);
    ctx.lineTo(x + width - 8, y - rise + 6);
    ctx.stroke();
  }
  function drawHouse(ctx, x, baseline, w, h, color, variant, t, reduced, lit) {
    const roofH = w * 0.46;
    const top = baseline - h;
    ctx.fillStyle = "rgba(26,42,48,0.16)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.5, baseline + 4, w * 0.42, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(x, top, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, top, w, h);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 2;
    for (let y = top + 8; y < baseline; y += 7) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(26,42,48,0.28)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, top + 1, w - 2, h - 2);
    ctx.fillStyle = ROOF;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.06, top + 2);
    ctx.lineTo(x + w * 0.5, top - roofH);
    ctx.lineTo(x + w * 1.06, top + 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, top - roofH + 4);
    ctx.lineTo(x + w * 0.5, top);
    ctx.stroke();
    const chimX = variant % 2 === 0 ? x + w * 0.72 : x + w * 0.22;
    ctx.fillStyle = "#5C534C";
    ctx.fillRect(chimX, top - roofH * 0.72, w * 0.1, roofH * 0.62);
    if (!reduced) smoke(ctx, chimX + w * 0.05, top - roofH * 0.78, t + variant);
    const doorLeft = variant % 2 === 0;
    const doorW = w * 0.22;
    const doorH = h * 0.38;
    const doorX = doorLeft ? x + w * 0.14 : x + w * 0.64;
    const doorY = baseline - doorH;
    ctx.fillStyle = doorLeft ? "#F3E2B8" : "#1A2A30";
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.fillStyle = TRIM;
    ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, 3);
    ctx.fillStyle = lit ? "#F2C14E" : "#C9A15A";
    ctx.beginPath();
    ctx.arc(doorLeft ? doorX + doorW - 4 : doorX + 4, doorY + doorH * 0.55, 1.6, 0, Math.PI * 2);
    ctx.fill();
    const wins = variant === 2 ? 3 : 2;
    const winW = w * 0.16;
    const winH = h * 0.16;
    const rowY = top + h * 0.22;
    for (let i = 0; i < wins; i++) {
      const wx = x + w * (0.16 + i * (wins === 3 ? 0.28 : 0.38));
      windowPane(ctx, wx, rowY, winW, winH, lit, t, i);
    }
    if (variant !== 1) {
      const side = doorLeft ? x + w * 0.62 : x + w * 0.18;
      windowPane(ctx, side, top + h * 0.52, winW, winH * 0.92, lit, t, 2);
    } else {
      ctx.fillStyle = TRIM;
      ctx.fillRect(doorLeft ? x + w * 0.58 : x + w * 0.14, top + h * 0.5, w * 0.26, h * 0.2);
      windowPane(ctx, doorLeft ? x + w * 0.61 : x + w * 0.17, top + h * 0.53, w * 0.09, h * 0.14, lit, t, 3);
      windowPane(ctx, doorLeft ? x + w * 0.72 : x + w * 0.28, top + h * 0.53, w * 0.09, h * 0.14, lit, t, 4);
    }
    if (variant === 3) {
      ctx.fillStyle = TRIM;
      ctx.beginPath();
      ctx.arc(x + w * 0.5, top + h * 0.12, w * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lit ? "#F6D98A" : "#9BB7C4";
      ctx.beginPath();
      ctx.arc(x + w * 0.5, top + h * 0.12, w * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    if (variant === 4 || variant === 0) {
      ctx.fillStyle = "#3E8C45";
      ctx.fillRect(x + w * 0.08, baseline - h * 0.08, w * 0.16, h * 0.05);
      ctx.fillStyle = "#E24B3B";
      ctx.beginPath();
      ctx.arc(x + w * 0.12, baseline - h * 0.1, 2.2, 0, Math.PI * 2);
      ctx.arc(x + w * 0.18, baseline - h * 0.12, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#D7CBBA";
    ctx.fillRect(x + w * 0.28, baseline, w * 0.44, 7);
    ctx.fillRect(x + w * 0.34, baseline + 7, w * 0.32, 5);
  }
  function windowPane(ctx, x, y, w, h, lit, t, n) {
    ctx.fillStyle = TRIM;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = lit ? "#F8E2A0" : "#7EA4B4";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(26,42,48,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
    if (!lit && Math.sin(t * 0.8 + n) > 0.2) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(x + 1, y + 1, w * 0.28, h * 0.22);
    }
  }
  function smoke(ctx, x, y, t) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.45 + i * 0.33) % 1;
      ctx.beginPath();
      ctx.arc(x + Math.sin(t + i) * 4, y - p * 28, 2 + p * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function jellybean(ctx, x, y, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.45);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(26,42,48,0.18)";
    ctx.beginPath();
    ctx.ellipse(2, 6, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-5, -8, 5, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function gull(ctx, w, top, t) {
    ctx.strokeStyle = "rgba(26,42,48,0.55)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    for (let i = 0; i < 2; i++) {
      const x = (t * 28 + i * 220) % (w + 80) - 40;
      const y = top + 24 + Math.sin(t * 2 + i) * 10;
      const flap = Math.sin(t * 7 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(x - 12, y);
      ctx.quadraticCurveTo(x - 6, y - 6 - flap, x, y);
      ctx.quadraticCurveTo(x + 6, y - 6 - flap, x + 12, y);
      ctx.stroke();
    }
  }
  function fogVeil(ctx, w, h, amount, t, reduced) {
    if (amount <= 0.01) return;
    const drift = reduced ? 0 : Math.sin(t * 0.3) * 20;
    const g = ctx.createLinearGradient(0, h * 0.2, 0, h);
    g.addColorStop(0, `rgba(244, 240, 234, ${amount * 0.15})`);
    g.addColorStop(0.55, `rgba(232, 236, 236, ${amount * 0.35})`);
    g.addColorStop(1, `rgba(220, 226, 226, ${amount * 0.7})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgba(255,255,255,${amount * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(w * 0.3 + drift, h * 0.62, w * 0.4, 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  function specksDraw(ctx, specks) {
    for (const s of specks) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function floatersDraw(ctx, floaters) {
    ctx.font = "700 18px Fraunces, Georgia, serif";
    ctx.textAlign = "center";
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillStyle = "#1A2A30";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
  function burst(specks, x, y, color) {
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 2 * i / 16 + Math.random() * 0.2;
      const sp = 40 + Math.random() * 90;
      specks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.55,
        max: 0.55,
        color,
        size: 2 + Math.random() * 2.5
      });
    }
  }
  function stepFx(specks, floaters, dt) {
    for (const s of specks) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 80 * dt;
    }
    for (let i = specks.length - 1; i >= 0; i--) if (specks[i].life <= 0) specks.splice(i, 1);
    for (const f of floaters) {
      f.life -= dt;
      f.y -= 22 * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].life <= 0) floaters.splice(i, 1);
  }

  // src/game/engine.ts
  var ROUND_SECONDS = 72;
  var CORRECT = ["Lovely.", "That's the one.", "Proper colour.", "They'll see that."];
  var WRONG = ["Not that door.", "Wrong tin, b'y.", "Fog hides a miss."];
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var Game = class {
    state;
    rand = mulberry32(1);
    best;
    constructor(best = 0) {
      this.best = best;
      this.state = this.fresh();
    }
    fresh() {
      return {
        phase: "title",
        houses: Array.from({ length: HOUSE_COUNT }, (_, i) => ({
          variant: i % 5,
          scenery: PAINTS[i % PAINTS.length].id,
          target: null,
          locked: false,
          flash: null,
          wrongT: 0
        })),
        palette: PAINTS.slice(0, 4).map((p) => p.id),
        street: STREETS[0],
        score: 0,
        best: this.best,
        combo: 0,
        timeLeft: ROUND_SECONDS,
        rowLeft: 13,
        rowBudget: 13,
        rowsCleared: 0,
        rowMistakes: 0,
        selected: null,
        banner: "Match the jellybean.",
        bannerT: 0,
        celebrate: 0,
        paused: false,
        newBest: false
      };
    }
    start(seed = Date.now()) {
      this.rand = mulberry32(seed);
      this.best = this.state.best;
      this.state = this.fresh();
      this.state.phase = "play";
      this.state.selected = this.state.palette[0] ?? null;
      this.deal();
      this.state.banner = "Match the jellybean.";
      this.state.bannerT = 2;
    }
    togglePause() {
      if (this.state.phase !== "play") return;
      this.state.paused = !this.state.paused;
    }
    select(id) {
      if (this.state.phase !== "play" || this.state.paused || this.state.celebrate > 0) return;
      if (!this.state.palette.includes(id)) return;
      this.state.selected = id;
    }
    paint(index) {
      const s = this.state;
      if (s.phase !== "play" || s.paused || s.celebrate > 0) return "ignore";
      const house = s.houses[index];
      if (!house || house.target === null || house.locked) return "ignore";
      if (!s.selected) {
        s.banner = "Pick a colour first.";
        s.bannerT = 0.9;
        return "need-color";
      }
      if (s.selected === house.target) {
        house.locked = true;
        house.flash = null;
        house.wrongT = 0;
        s.combo += 1;
        s.score += 100 + (s.combo - 1) * 25;
        s.banner = CORRECT[Math.floor(this.rand() * CORRECT.length)];
        s.bannerT = 0.85;
        if (s.houses.every((h) => h.target === null || h.locked)) {
          this.completeRow();
          return "clear";
        }
        return "ok";
      }
      house.flash = s.selected;
      house.wrongT = 0.42;
      s.combo = 0;
      s.rowMistakes += 1;
      s.banner = WRONG[Math.floor(this.rand() * WRONG.length)];
      s.bannerT = 0.8;
      return "wrong";
    }
    tick(dt) {
      const s = this.state;
      if (s.phase !== "play" || s.paused) return;
      const step = Math.min(dt, 0.1);
      s.bannerT = Math.max(0, s.bannerT - step);
      for (const house of s.houses) house.wrongT = Math.max(0, house.wrongT - step);
      s.timeLeft -= step;
      if (s.timeLeft <= 0) {
        s.timeLeft = 0;
        this.finish();
        return;
      }
      if (s.celebrate > 0) {
        s.celebrate -= step;
        if (s.celebrate <= 0) this.deal();
        return;
      }
      s.rowLeft -= step;
      if (s.rowLeft <= 0) {
        s.combo = 0;
        s.banner = "The fog took that row.";
        s.bannerT = 1.2;
        s.rowsCleared += 1;
        this.deal();
      }
    }
    completeRow() {
      const s = this.state;
      const perfect = s.rowMistakes === 0;
      s.rowsCleared += 1;
      s.score += 180 + s.rowsCleared * 40;
      if (perfect) s.timeLeft = Math.min(99, s.timeLeft + 4);
      s.banner = perfect ? "Yes b'y \u2014 the whole row." : "Row's up.";
      s.bannerT = 1.15;
      s.celebrate = 0.62;
    }
    finish() {
      const s = this.state;
      s.phase = "over";
      s.paused = false;
      s.celebrate = 0;
      s.newBest = s.score > s.best;
      if (s.newBest) s.best = s.score;
      this.best = s.best;
      s.banner = s.newBest ? "Best yet. The hill remembers." : "The harbour's gone white.";
    }
    deal() {
      const s = this.state;
      const targets = this.targetCount();
      const palette = PAINTS.slice(0, this.paletteCount()).map((p) => p.id);
      s.palette = palette;
      if (!s.selected || !palette.includes(s.selected)) s.selected = palette[0] ?? null;
      const order = shuffle(
        Array.from({ length: HOUSE_COUNT }, (_, i) => i),
        this.rand
      );
      const targetSet = new Set(order.slice(0, targets));
      for (let i = 0; i < HOUSE_COUNT; i++) {
        const house = s.houses[i];
        house.flash = null;
        house.wrongT = 0;
        if (targetSet.has(i)) {
          house.target = palette[Math.floor(this.rand() * palette.length)];
          house.locked = false;
        } else {
          house.target = null;
          house.locked = false;
          house.scenery = PAINTS[Math.floor(this.rand() * PAINTS.length)].id;
        }
      }
      s.rowMistakes = 0;
      s.rowBudget = Math.max(6.4, 13.2 - s.rowsCleared * 0.62);
      s.rowLeft = s.rowBudget;
      s.street = STREETS[s.rowsCleared % STREETS.length];
      s.celebrate = 0;
    }
    targetCount() {
      const n = this.state.rowsCleared;
      if (n < 2) return 3;
      if (n < 5) return 4;
      return 5;
    }
    paletteCount() {
      const n = this.state.rowsCleared;
      if (n < 2) return 4;
      if (n < 5) return 5;
      return 6;
    }
  };
  function shuffle(list, rand) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const a = next[i];
      next[i] = next[j];
      next[j] = a;
    }
    return next;
  }

  // src/game/mount.ts
  var BEST_KEY = "funapps-jellybean-row-best";
  var MUTE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M16 9.5a4 4 0 0 1 0 5"/></svg>`;
  var MUTED = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h4l5-4v12l-5-4H4z"/><path d="M17 10l4 4M21 10l-4 4"/></svg>`;
  var PAUSE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>`;
  function readBest() {
    try {
      const n = Number(localStorage.getItem(BEST_KEY) ?? "0");
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  function writeBest(n) {
    try {
      localStorage.setItem(BEST_KEY, String(n));
    } catch {
    }
  }
  function mountJellybean(root2) {
    root2.replaceChildren();
    root2.className = "jb";
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    if (!context) return () => {
    };
    const ctx = context;
    const top = el("header", "jb-top");
    const brand = el("div", "jb-brand");
    const kicker = el("p", "jb-kicker");
    kicker.textContent = "St. John\u2019s";
    const street2 = el("p", "jb-street");
    street2.textContent = "Jellybean Row";
    brand.append(kicker, street2);
    const stats = el("div", "jb-stats");
    const scoreStat = stat("Score");
    const timeStat = stat("Fog");
    const bestStat = stat("Best");
    const soundBtn = iconButton("Sound", MUTE);
    const pauseBtn = iconButton("Pause", PAUSE);
    stats.append(scoreStat.box, timeStat.box, bestStat.box, soundBtn, pauseBtn);
    top.append(brand, stats);
    const banner = el("p", "jb-banner");
    banner.setAttribute("aria-live", "polite");
    banner.hidden = true;
    const title = card();
    const h1 = document.createElement("h1");
    h1.textContent = "Jellybean Row";
    const lede = el("p", "jb-lede");
    lede.textContent = "St. John\u2019s paints the houses loud so a boat can still find home when the fog comes in.";
    const help = el("p", "jb-help");
    help.textContent = "Tap a colour, then the house with that jellybean. Clear the row before the fog line runs out.";
    const go = document.createElement("button");
    go.className = "jb-go";
    go.type = "button";
    go.textContent = "Paint the row";
    const keys = el("p", "jb-keys");
    keys.textContent = "Keys 1\u20136 pick a colour. Q W E R T paint the houses, left to right.";
    const arcade = document.createElement("a");
    arcade.className = "jb-arcade";
    arcade.href = "https://funapps.ca/";
    arcade.textContent = "FunApps arcade";
    const bestLine = el("p", "jb-help");
    title.append(h1, lede, help, go, keys, bestLine, arcade);
    const over = card();
    over.hidden = true;
    const h2 = document.createElement("h2");
    h2.textContent = "Fogged in";
    const overLede = el("p", "jb-lede");
    const again = document.createElement("button");
    again.className = "jb-go";
    again.type = "button";
    again.textContent = "Paint again";
    const overScore = el("div", "jb-scoreline");
    const overBest = el("div", "jb-scoreline");
    const overArcade = arcade.cloneNode(true);
    over.append(h2, overLede, overScore, overBest, again, overArcade);
    const pauseCard = el("div", "jb-pause");
    pauseCard.hidden = true;
    const pauseCopy = document.createElement("p");
    pauseCopy.textContent = "Fog\u2019s holding.";
    const resume = document.createElement("button");
    resume.className = "jb-go";
    resume.type = "button";
    resume.textContent = "Keep painting";
    pauseCard.append(pauseCopy, resume);
    const rowbar = el("div", "jb-rowbar");
    const rowfill = document.createElement("span");
    rowbar.append(rowfill);
    rowbar.hidden = true;
    const pots = el("div", "jb-pots");
    pots.hidden = true;
    root2.append(canvas, top, banner, title, over, pauseCard, rowbar, pots);
    const game = new Game(readBest());
    window.__jellybean = game;
    const sfx = new Sfx();
    const specks = [];
    const floaters = [];
    let boxes = [];
    let last = performance.now();
    let raf = 0;
    let warnedSecond = 99;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paletteKey = "";
    const houseKeys = ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT"];
    function sync() {
      const s = game.state;
      scoreStat.value.textContent = String(s.score);
      timeStat.value.textContent = String(Math.ceil(s.timeLeft));
      bestStat.value.textContent = String(s.best);
      street2.textContent = s.phase === "title" ? "Jellybean Row" : s.street;
      title.hidden = s.phase !== "title";
      over.hidden = s.phase !== "over";
      pots.hidden = s.phase !== "play";
      rowbar.hidden = s.phase !== "play";
      pauseBtn.hidden = s.phase !== "play";
      pauseCard.hidden = !(s.phase === "play" && s.paused);
      bestLine.textContent = s.best > 0 ? `Best on this browser: ${s.best}` : "No sign-up. Just colour.";
      if (s.bannerT > 0 && s.phase === "play") {
        banner.hidden = false;
        banner.textContent = s.banner;
      } else banner.hidden = true;
      if (s.phase === "play") {
        const ratio = s.rowBudget > 0 ? Math.max(0, s.rowLeft / s.rowBudget) : 0;
        rowfill.style.transform = `scaleX(${ratio})`;
        rowbar.classList.toggle("warn", ratio < 0.28);
      }
      if (s.phase === "over") {
        h2.textContent = s.newBest ? "Best yet" : "Fogged in";
        overLede.textContent = s.newBest ? `${s.rowsCleared} rows. The hill remembers this one.` : `${s.rowsCleared} rows before the harbour went white.`;
        fillScore(overScore, "Score", s.score);
        fillScore(overBest, "Best", s.best);
      }
      const key = s.palette.join(",");
      if (key !== paletteKey) {
        paletteKey = key;
        buildPots();
      } else {
        markPots();
      }
      root2.style.setProperty("--pot-h", `${pots.hidden ? 16 : pots.offsetHeight}px`);
    }
    function buildPots() {
      pots.replaceChildren();
      game.state.palette.forEach((id, i) => {
        const paint = paintById(id);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "jb-pot";
        btn.dataset.paint = id;
        btn.style.background = paint.hex;
        btn.style.color = inkFor(paint.hex);
        const label = document.createElement("span");
        label.textContent = paint.name;
        const hint = document.createElement("small");
        hint.textContent = String(i + 1);
        btn.append(label, hint);
        btn.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          sfx.unlock();
          game.select(id);
          sync();
        });
        pots.append(btn);
      });
      markPots();
    }
    function markPots() {
      const selected = game.state.selected;
      for (const btn of pots.querySelectorAll(".jb-pot")) {
        btn.classList.toggle("on", btn.dataset.paint === selected);
      }
    }
    function begin() {
      sfx.unlock();
      warnedSecond = 99;
      game.start();
      sync();
    }
    function onPaint(index, box) {
      const before = game.state.score;
      const result = game.paint(index);
      if (result === "ok" || result === "clear") {
        sfx.ok();
        if (result === "clear") sfx.row();
        const house = game.state.houses[index];
        const color = house?.target ? paintById(house.target).hex : "#E6A01D";
        if (box) {
          burst(specks, box.x + box.w / 2, box.y + box.h * 0.4, color);
          floaters.push({
            x: box.chipX,
            y: box.y,
            text: `+${game.state.score - before}`,
            life: 0.8,
            max: 0.8
          });
        }
      } else if (result === "wrong") {
        sfx.bad();
      }
      sync();
    }
    go.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      begin();
    });
    again.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      begin();
    });
    resume.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      sfx.unlock();
      if (game.state.paused) game.togglePause();
      sync();
    });
    pauseBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      game.togglePause();
      sync();
    });
    soundBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      soundBtn.innerHTML = sfx.muted ? MUTED : MUTE;
      soundBtn.setAttribute("aria-label", sfx.muted ? "Unmute" : "Mute");
    });
    canvas.addEventListener("pointerdown", (event) => {
      if (game.state.phase !== "play") return;
      sfx.unlock();
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * root2.clientWidth;
      const y = (event.clientY - rect.top) / rect.height * root2.clientHeight;
      const hit = boxes.filter((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h).at(-1);
      if (!hit) return;
      onPaint(hit.index, hit);
    });
    function onKey(event) {
      if (event.repeat) return;
      if (event.code === "Escape" && game.state.phase === "play") {
        game.togglePause();
        sync();
        return;
      }
      if (event.code === "KeyM") {
        sfx.unlock();
        sfx.setMuted(!sfx.muted);
        soundBtn.innerHTML = sfx.muted ? MUTED : MUTE;
        return;
      }
      const digit = Number(event.key);
      if (digit >= 1 && digit <= game.state.palette.length) {
        sfx.unlock();
        const id = game.state.palette[digit - 1];
        if (id) game.select(id);
        sync();
        return;
      }
      const hi = houseKeys.indexOf(event.code);
      if (hi >= 0 && game.state.phase === "play") {
        event.preventDefault();
        sfx.unlock();
        onPaint(hi, boxes[hi]);
      }
    }
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1e3);
      last = now;
      const prevPhase = game.state.phase;
      const prev = Math.ceil(game.state.timeLeft);
      game.tick(dt);
      if (prevPhase !== "over" && game.state.phase === "over") {
        sfx.horn();
        writeBest(game.state.best);
      }
      if (game.state.phase === "play" && !game.state.paused) {
        const sec = Math.ceil(game.state.timeLeft);
        if (sec <= 5 && sec > 0 && sec < warnedSecond && prev !== sec) {
          warnedSecond = sec;
          sfx.tick();
        }
        if (sec > 5) warnedSecond = 99;
      }
      stepFx(specks, floaters, dt);
      sync();
      paintCanvas();
      raf = requestAnimationFrame(frame);
    }
    const onVis = () => {
      if (document.visibilityState === "visible") sfx.resume();
    };
    function paintCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = root2.clientWidth;
      const cssH = root2.clientHeight;
      const bw = Math.max(1, Math.floor(cssW * dpr));
      const bh = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const topH = top.getBoundingClientRect().height;
      const bottomH = pots.hidden ? 18 : pots.getBoundingClientRect().height + 12;
      boxes = drawStreet(
        ctx,
        cssW,
        cssH,
        game.state,
        performance.now() / 1e3,
        { top: topH, bottom: bottomH },
        specks,
        floaters,
        reduced
      );
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    sync();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      const slot = window;
      if (slot.__jellybean === game) delete slot.__jellybean;
    };
  }
  function el(tag, className) {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }
  function stat(label) {
    const box = el("div", "jb-stat");
    const span = document.createElement("span");
    span.textContent = label;
    const value = document.createElement("strong");
    value.textContent = "0";
    box.append(span, value);
    return { box, value };
  }
  function iconButton(label, svg) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "jb-icon";
    btn.setAttribute("aria-label", label);
    btn.innerHTML = svg;
    return btn;
  }
  function card() {
    const node = el("section", "jb-card");
    return node;
  }
  function fillScore(node, label, n) {
    node.replaceChildren();
    const a = document.createElement("div");
    const s = document.createElement("span");
    s.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = String(n);
    a.append(s, strong);
    node.append(a);
  }

  // src/game/standalone.ts
  var root = document.querySelector("#app");
  if (root) mountJellybean(root);
})();
