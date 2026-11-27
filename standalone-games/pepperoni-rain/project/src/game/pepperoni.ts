export type PepperoniApi = {
  destroy: () => void;
  setMuted: (muted: boolean) => void;
};

type Kind = "mild" | "hot" | "honey" | "cheese" | "donair" | "tnt" | "char";
type Phase = "fall" | "eat" | "splat";
type Mode = "auto" | "pointer" | "keys";

type Flavor = {
  kind: Exclude<Kind, "char">;
  name: string;
  points: number;
  weight: number;
  casing: string;
  meat: string;
  accent: string;
};

type Stick = {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  phase: Phase;
  life: number;
  sx: number;
  sy: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  grav: number;
};

type Floater = {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  big: boolean;
};

type Decal = { x: number; y: number; r: number; color: string; a: number };

type Layout = {
  w: number;
  h: number;
  dpr: number;
  laneX: number;
  laneW: number;
  floorY: number;
  hoodX: number;
  hoodY: number;
  hoodW: number;
  hoodH: number;
};

const FLAVORS: Flavor[] = [
  { kind: "mild", name: "MILD", points: 10, weight: 26, casing: "#5c2218", meat: "#8a3024", accent: "#e7b8a4" },
  { kind: "hot", name: "HOT", points: 20, weight: 22, casing: "#4a1612", meat: "#7a2018", accent: "#ff4a2a" },
  { kind: "honey", name: "HONEY GARLIC", points: 40, weight: 15, casing: "#6e301c", meat: "#8a3820", accent: "#ffd15a" },
  { kind: "cheese", name: "CHEESE", points: 30, weight: 14, casing: "#5e2418", meat: "#e2c27a", accent: "#ffe7a3" },
  { kind: "donair", name: "DONAIR", points: 55, weight: 12, casing: "#5a2016", meat: "#7a2418", accent: "#f7f3ea" },
  { kind: "tnt", name: "TNT", points: 100, weight: 8, casing: "#241816", meat: "#c43a22", accent: "#ffb020" },
];

const BEST_KEY = "pepperoni-rain-best-v1";

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

function readBest(): number {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* private mode */
  }
}

export function mountPepperoniRain(host: HTMLElement): PepperoniApi {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block;touch-action:none;";
  canvas.setAttribute(
    "aria-label",
    "Pepperoni Rain. Slide sideways to catch falling pepperoni sticks. Let charcoal lumps fall.",
  );
  host.replaceChildren(canvas);
  const ctxMaybe = canvas.getContext("2d");
  if (!ctxMaybe) {
    return { destroy() {}, setMuted() {} };
  }
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let muted = false;
  let audioCtx: AudioContext | null = null;
  let audioOn = false;

  const layout: Layout = {
    w: 390,
    h: 700,
    dpr: 1,
    laneX: 0,
    laneW: 390,
    floorY: 660,
    hoodX: 40,
    hoodY: 8,
    hoodW: 300,
    hoodH: 58,
  };

  let bg: HTMLCanvasElement | null = null;
  let mode: Mode = "auto";
  let score = 0;
  let best = readBest();
  let bestShown = best;
  let lives = 3;
  let combo = 0;
  let time = 0;
  let shield = 3.4;
  let over = false;
  let pendingOver = 0;
  let freeze = 0;
  let trauma = 0;
  let flash = 0;
  let flashColor = "255, 50, 30";
  let scorePop = 1;
  let bagX = 180;
  let targetX = 180;
  let squash = 1;
  let bagW = 128;
  let bagH = 96;
  let spawnAcc = 0.15;
  let nextRush = 16;
  let rushUntil = 0;
  let banner = 0;
  let hint = 1;
  let nextId = 1;
  let newBest = false;
  let lastMouse = Number.NaN;
  let placed = false;
  let acc = 0;
  let last = performance.now();
  let raf = 0;
  let paused = false;

  const sticks: Stick[] = [];
  const particles: Particle[] = [];
  const floaters: Floater[] = [];
  const decals: Decal[] = [];

  const keys = { left: false, right: false };

  function unlock() {
    if (muted) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    audioOn = true;
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
    if (muted || !audioOn || !audioCtx) return;
    const a = audioCtx;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(48, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }

  function noise(dur: number, gain: number) {
    if (muted || !audioOn || !audioCtx) return;
    const a = audioCtx;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(a.destination);
    src.start();
  }

  function flavorOf(kind: Kind): Flavor | null {
    return FLAVORS.find((f) => f.kind === kind) ?? null;
  }

  function pickKind(): Kind {
    const charP = Math.min(0.2, 0.045 + time * 0.0026);
    if (Math.random() < charP) return "char";
    const total = FLAVORS.reduce((s, f) => s + f.weight, 0);
    let r = Math.random() * total;
    for (const f of FLAVORS) {
      r -= f.weight;
      if (r <= 0) return f.kind;
    }
    return "mild";
  }

  function laneCenter() {
    return layout.laneX + layout.laneW / 2;
  }

  function bagLimits() {
    const minX = layout.laneX + bagW / 2 + 6;
    const maxX = layout.laneX + layout.laneW - bagW / 2 - 6;
    return { minX, maxX };
  }

  function spawnStick(y: number, spreadScale: number) {
    const kind = pickKind();
    const rushing = time < rushUntil;
    const spread = Math.min(layout.laneW * 0.46, (34 + time * 6.2) * spreadScale) * (rushing ? 1.2 : 1);
    const center = laneCenter();
    const x = clamp(center + (Math.random() - 0.5) * 2 * spread, layout.laneX + 28, layout.laneX + layout.laneW - 28);
    const speed = Math.min(700, (248 + time * 7.5) * (rushing ? 1.12 : 1));
    const vy =
      speed *
      (kind === "tnt" ? 1.28 : kind === "char" ? 0.9 : kind === "donair" ? 1.05 : 1) *
      (0.92 + Math.random() * 0.16);
    const stick: Stick = {
      id: nextId++,
      kind,
      x,
      y,
      vx: (Math.random() - 0.5) * (26 + Math.min(80, time * 1.6)),
      vy,
      rot: (Math.random() - 0.5) * 0.7,
      vr: (Math.random() - 0.5) * (reduce ? 0.4 : 2.4),
      w: kind === "char" ? 34 : 26,
      h: kind === "char" ? 28 : 158,
      phase: "fall",
      life: 1,
      sx: 1,
      sy: 1,
    };
    sticks.push(stick);
  }

  function burst(x: number, y: number, color: string, n: number, up = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 160;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * (up ? -1 : 1) - (up ? 40 : 0),
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        size: 2 + Math.random() * 3.5,
        color,
        grav: up ? -20 : 280,
      });
    }
  }

  function popup(x: number, y: number, text: string, color: string, big: boolean) {
    floaters.push({ x, y, vy: -54, life: 0.95, text, color, big });
  }

  function addDecal(x: number, color: string, r: number) {
    decals.push({ x, y: layout.floorY + 6, r, color, a: 0.72 });
    if (decals.length > 28) decals.shift();
  }

  function hurt() {
    if (shield > 0 || over || pendingOver > 0) return;
    lives -= 1;
    combo = 0;
    trauma = Math.min(1, trauma + (reduce ? 0 : 0.62));
    flash = 1;
    flashColor = "255, 48, 28";
    freeze = 0.07;
    tone(120, 0.2, "sawtooth", 0.045, -70);
    noise(0.14, 0.05);
    if (lives <= 0) pendingOver = 0.42;
  }

  function catchStick(s: Stick) {
    if (s.kind === "char") {
      s.phase = "splat";
      s.life = 0.22;
      s.sy = 0.45;
      s.sx = 1.3;
      burst(s.x, s.y, "#8a776c", 14);
      tone(90, 0.16, "square", 0.04, -40);
      noise(0.1, 0.06);
      hurt();
      return;
    }
    const spec = flavorOf(s.kind);
    if (!spec) return;
    s.phase = "eat";
    s.life = 0.15;
    combo += 1;
    const mult = 1 + Math.min(10, combo) * 0.1;
    const pts = Math.round(spec.points * mult);
    score += pts;
    scorePop = 1.38;
    if (score > best) {
      if (score > bestShown) newBest = bestShown > 0 && score > bestShown;
      best = score;
      writeBest(best);
    }
    popup(s.x, s.y - 20, combo >= 3 ? `${spec.name} +${pts}` : `+${pts}`, spec.accent, s.kind === "tnt");
    if (s.kind === "tnt") {
      popup(s.x, s.y - 52, "TNT", "#ffb020", true);
      trauma = Math.min(1, trauma + (reduce ? 0 : 0.5));
      freeze = 0.05;
      flash = 0.55;
      flashColor = "255, 170, 40";
      tone(160, 0.18, "square", 0.06, -90);
      noise(0.12, 0.07);
    } else {
      trauma = Math.min(1, trauma + (reduce ? 0 : 0.14));
      const pitch = 280 + spec.points * 2.2 + combo * 8;
      tone(pitch, 0.08, "triangle", 0.06);
      noise(0.04, 0.03);
    }
    burst(s.x, bagTop() + 8, spec.accent, s.kind === "tnt" ? 18 : 9, true);
    squash = 0.78;
  }

  function missStick(s: Stick) {
    if (s.kind === "char") {
      burst(s.x, layout.floorY, "#5c5048", 6);
      addDecal(s.x, "#1a120e", 8);
      s.phase = "splat";
      s.life = 0.01;
      return;
    }
    s.phase = "splat";
    s.life = 0.22;
    s.y = layout.floorY - 6;
    s.sy = 0.28;
    s.sx = 1.55;
    const spec = flavorOf(s.kind);
    addDecal(s.x, spec?.casing ?? "#8d2418", 16);
    burst(s.x, layout.floorY, spec?.casing ?? "#8d2418", 8);
    tone(180, 0.1, "sine", 0.03, -100);
    hurt();
  }

  function bagTop() {
    return layout.floorY - bagH + 10;
  }

  function tick(dt: number) {
    time += dt;
    shield = Math.max(0, shield - dt);
    if (freeze > 0) freeze = Math.max(0, freeze - dt);
    trauma = Math.max(0, trauma - dt * 1.7);
    flash = Math.max(0, flash - dt * 1.8);
    scorePop += (1 - scorePop) * (1 - Math.exp(-10 * dt));
    squash += (1 - squash) * (1 - Math.exp(-12 * dt));
    if (mode !== "auto" || over) hint = 0;
    else hint += (1 - hint) * (1 - Math.exp(-8 * dt));
    banner = Math.max(0, banner - dt);

    if (pendingOver > 0) {
      pendingOver -= dt;
      if (pendingOver <= 0) {
        over = true;
        if (best > bestShown) newBest = true;
        bestShown = best;
      }
    }

    const rushing = time < rushUntil;
    if (!over && time >= nextRush) {
      rushUntil = time + 5.2;
      nextRush = time + 20 + Math.random() * 4;
      banner = 1.25;
      burst(laneCenter(), layout.hoodY + layout.hoodH, "#ff6a2a", 16, true);
    }

    if (!over && pendingOver <= 0 && freeze <= 0) {
      const base = Math.max(0.36, 0.82 - time * 0.009);
      const interval = rushing ? base * 0.45 : base;
      spawnAcc += dt;
      while (spawnAcc >= interval) {
        spawnAcc -= interval;
        spawnStick(layout.hoodY + layout.hoodH + 78, mode === "auto" && time < 8 ? 0.45 : 1);
        if (rushing && Math.random() < 0.55) spawnStick(layout.hoodY + layout.hoodH + 96, 1);
      }

      const { minX, maxX } = bagLimits();
      if (mode === "auto") {
        const amp = Math.min(layout.laneW * 0.22, 18 + time * 7);
        targetX = clamp(laneCenter() + Math.sin(time * 1.25) * amp, minX, maxX);
        bagX += (targetX - bagX) * (1 - Math.exp(-8 * dt));
      } else if (mode === "keys") {
        const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (dir !== 0) bagX = clamp(bagX + dir * 920 * dt, minX, maxX);
      } else {
        targetX = clamp(targetX, minX, maxX);
        bagX += (targetX - bagX) * (1 - Math.exp(-22 * dt));
      }

      const mouth = bagTop() + 16;
      for (const s of sticks) {
        if (s.phase === "fall") {
          const prev = s.y;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rot += s.vr * dt;
          if (s.y > mouth - 90 && s.kind !== "char") {
            const dx = bagX - s.x;
            const pull = bagW * 0.48;
            if (Math.abs(dx) < pull) s.x += Math.sign(dx) * Math.min(Math.abs(dx), 70 * dt);
          }
          const edge = layout.laneX + 16;
          const edgeR = layout.laneX + layout.laneW - 16;
          if (s.x < edge || s.x > edgeR) s.vx *= -0.85;
          s.x = clamp(s.x, edge, edgeR);
          if (prev < mouth && s.y >= mouth) {
            const reach = bagW * 0.52;
            if (Math.abs(s.x - bagX) < reach) catchStick(s);
          }
          if (s.phase === "fall" && s.y > layout.floorY + 8) missStick(s);
        } else if (s.phase === "eat") {
          s.life -= dt;
          const k = 1 - Math.exp(-16 * dt);
          s.x += (bagX - s.x) * k;
          s.y += (mouth + 20 - s.y) * k;
          s.sx = Math.max(0.05, s.life / 0.15);
          s.sy = s.sx;
          s.rot *= 0.9;
        } else {
          s.life -= dt;
          s.sy += (0.22 - s.sy) * 0.4;
          s.sx += (1.45 - s.sx) * 0.3;
        }
      }
      for (let i = sticks.length - 1; i >= 0; i--) {
        const s = sticks[i];
        if (!s) continue;
        if ((s.phase === "eat" || s.phase === "splat") && s.life <= 0) sticks.splice(i, 1);
      }
    } else if (mode === "auto" && !over) {
      const { minX, maxX } = bagLimits();
      const amp = Math.min(layout.laneW * 0.22, 18 + time * 7);
      targetX = clamp(laneCenter() + Math.sin(time * 1.15) * amp, minX, maxX);
      bagX += (targetX - bagX) * (1 - Math.exp(-8 * dt));
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (!p) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      if (!f) continue;
      f.life -= dt;
      f.y += f.vy * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }

    if (mode === "auto" && !over && Math.random() < dt * 6) {
      particles.push({
        x: layout.hoodX + 20 + Math.random() * (layout.hoodW - 40),
        y: layout.hoodY + layout.hoodH - 8,
        vx: (Math.random() - 0.5) * 16,
        vy: -30 - Math.random() * 40,
        life: 1.4,
        max: 1.4,
        size: 10 + Math.random() * 18,
        color: "230,214,196",
        grav: -8,
      });
    } else if (Math.random() < dt * (over ? 2 : 3.5)) {
      particles.push({
        x: layout.hoodX + Math.random() * layout.hoodW,
        y: layout.hoodY + layout.hoodH - 6,
        vx: (Math.random() - 0.5) * 20,
        vy: -24 - Math.random() * 30,
        life: 1.6,
        max: 1.6,
        size: 12 + Math.random() * 16,
        color: "230,214,196",
        grav: -6,
      });
    }
  }

  function seedWorld() {
    sticks.length = 0;
    const top = layout.hoodY + layout.hoodH + 86;
    const mouth = layout.floorY - bagH;
    spawnStick(mouth - 30, 0.15);
    spawnStick(mouth - 170, 0.3);
    spawnStick((top + mouth) / 2, 0.35);
    spawnStick(top + 20, 0.4);
    spawnStick(top + 150, 0.45);
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: layout.laneX + Math.random() * layout.laneW,
        y: layout.hoodY + Math.random() * layout.h * 0.45,
        vx: (Math.random() - 0.5) * 12,
        vy: -18 - Math.random() * 20,
        life: 0.6 + Math.random(),
        max: 1.6,
        size: 14,
        color: "230,214,196",
        grav: -4,
      });
    }
  }

  function restart() {
    score = 0;
    lives = 3;
    combo = 0;
    time = 0;
    shield = 0.7;
    over = false;
    pendingOver = 0;
    freeze = 0;
    trauma = 0;
    flash = 0;
    spawnAcc = 0;
    nextRush = 16;
    rushUntil = 0;
    banner = 0;
    newBest = false;
    bestShown = best;
    sticks.length = 0;
    floaters.length = 0;
    decals.length = 0;
    seedWorld();
    tone(240, 0.07, "sine", 0.04);
    tone(360, 0.09, "sine", 0.035);
  }

  function takeOver(clientX: number) {
    const wasAuto = mode === "auto";
    mode = "pointer";
    if (wasAuto) {
      shield = Math.max(shield, 0.6);
      unlock();
      tone(280, 0.06, "triangle", 0.04);
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * layout.w;
    targetX = x;
  }

  function resize() {
    const rect = host.getBoundingClientRect();
    const w = Math.max(280, rect.width);
    const h = Math.max(420, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    layout.w = w;
    layout.h = h;
    layout.dpr = dpr;
    layout.laneW = Math.min(w, 480);
    layout.laneX = (w - layout.laneW) / 2;
    layout.floorY = h - 34;
    layout.hoodW = layout.laneW * 0.74;
    layout.hoodH = 56;
    layout.hoodX = layout.laneX + (layout.laneW - layout.hoodW) / 2;
    layout.hoodY = 10;
    bagW = clamp(layout.laneW * 0.34, 116, 168);
    bagH = bagW * 0.72;
    const { minX, maxX } = bagLimits();
    if (!placed) {
      bagX = laneCenter();
      targetX = bagX;
      placed = true;
    } else {
      bagX = clamp(bagX, minX, maxX);
      targetX = clamp(targetX, minX, maxX);
    }
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    buildBg();
  }

  function buildBg() {
    const c = document.createElement("canvas");
    c.width = Math.floor(layout.w * layout.dpr);
    c.height = Math.floor(layout.h * layout.dpr);
    const g = c.getContext("2d");
    if (!g) return;
    g.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    const { w, h } = layout;
    const wall = g.createLinearGradient(0, 0, 0, h);
    wall.addColorStop(0, "#120806");
    wall.addColorStop(0.5, "#2c1410");
    wall.addColorStop(1, "#160b08");
    g.fillStyle = wall;
    g.fillRect(0, 0, w, h);
    const bw = 48;
    const bh = 18;
    for (let row = 0; row < h / (bh + 3) + 1; row++) {
      const off = row % 2 === 0 ? 0 : bw / 2;
      for (let x = -bw; x < w + bw; x += bw + 3) {
        const n = hash(row * 17 + x);
        g.fillStyle = n > 0.55 ? "#4a221b" : n > 0.25 ? "#3c1b16" : "#311612";
        g.fillRect(x + off, row * (bh + 3), bw, bh);
        g.fillStyle = "rgba(255, 190, 140, 0.05)";
        g.fillRect(x + off, row * (bh + 3), bw, 2);
      }
    }
    const vig = g.createRadialGradient(w / 2, h * 0.42, w * 0.15, w / 2, h * 0.5, w * 0.72);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.5)");
    g.fillStyle = vig;
    g.fillRect(0, 0, w, h);
    const fy = h - 36;
    g.fillStyle = "#1c100c";
    g.fillRect(0, fy, w, 40);
    for (let x = 0; x < w; x += 30) {
      g.fillStyle = hash(x) > 0.5 ? "#3b2218" : "#2a1812";
      g.fillRect(x, fy, 28, 40);
      g.fillStyle = "rgba(255, 210, 160, 0.06)";
      g.fillRect(x, fy, 28, 3);
    }
    bg = c;
  }

  function drawStick(s: Stick) {
    if (s.kind === "char") {
      drawChar(s);
      return;
    }
    const spec = flavorOf(s.kind);
    if (!spec) return;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.scale(s.sx, s.sy);
    const w = s.w;
    const h = s.h;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(2, h * 0.5, w * 0.7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    stickOutline(ctx, w, h);
    const base = spec.kind === "tnt" ? "#1c100e" : "#3c140f";
    ctx.fillStyle = base;
    ctx.fill();
    ctx.save();
    stickOutline(ctx, w, h);
    ctx.clip();
    const cols = 3;
    const rows = 11;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const y0 = -h / 2 + (r * h) / rows + 1.4;
        const x0 = -w / 2 + (c * w) / cols + 1;
        const pw = w / cols - 1.6;
        const ph = h / rows - 2.2;
        const lift = hash(s.id * 9 + r * 3 + c);
        ctx.fillStyle = shade(base, 10 + lift * 28);
        ctx.fillRect(x0, y0, pw, ph);
      }
    }
    ctx.strokeStyle = "rgba(8, 3, 2, 0.9)";
    ctx.lineWidth = 1.35;
    for (let r = 1; r < rows; r++) {
      const yy = -h / 2 + (r * h) / rows;
      ctx.beginPath();
      ctx.moveTo(-w / 2, yy);
      ctx.lineTo(w / 2, yy);
      ctx.stroke();
    }
    for (let c = 1; c < cols; c++) {
      const xx = -w / 2 + (c * w) / cols + (hash(s.id + c) - 0.5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(xx, -h / 2);
      ctx.lineTo(xx + (hash(s.id + c * 4) - 0.5) * 2, h / 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 170, 130, 0.2)";
    ctx.fillRect(-w * 0.34, -h / 2, w * 0.16, h);
    ctx.restore();

    if (spec.kind === "hot") {
      ctx.strokeStyle = "rgba(255, 60, 30, 0.8)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) {
        const yy = -h * 0.32 + i * (h * 0.18);
        ctx.beginPath();
        ctx.moveTo(-w * 0.28, yy);
        ctx.lineTo(w * 0.22, yy + 2);
        ctx.stroke();
      }
    } else if (spec.kind === "honey") {
      ctx.strokeStyle = "rgba(255, 196, 60, 0.9)";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(w * 0.08, -h * 0.28);
      ctx.quadraticCurveTo(w * 0.22, 0, w * 0.02, h * 0.32);
      ctx.stroke();
    } else if (spec.kind === "donair") {
      ctx.strokeStyle = "rgba(247, 243, 234, 0.92)";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-1, -h * 0.34);
      ctx.bezierCurveTo(w * 0.28, -h * 0.08, -w * 0.28, h * 0.08, 1, h * 0.32);
      ctx.stroke();
    } else if (spec.kind === "tnt") {
      const flick = 0.4 + 0.6 * Math.sin(time * 22 + s.id);
      ctx.strokeStyle = `rgba(255, 110, 30, ${0.45 + flick * 0.55})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-2, -h * 0.3);
      ctx.lineTo(1, -h * 0.05);
      ctx.lineTo(-1, h * 0.16);
      ctx.lineTo(2, h * 0.36);
      ctx.stroke();
    }

    ctx.fillStyle = spec.kind === "cheese" ? "#d7b56a" : "#7c2e22";
    ctx.fillRect(-w / 2 + 1, -h / 2, w - 2, 6);
    ctx.fillStyle = "rgba(40, 10, 8, 0.45)";
    ctx.fillRect(-3, -h / 2 + 1.5, 1.4, 2);
    ctx.fillRect(2, -h / 2 + 2.2, 1.2, 1.6);
    ctx.restore();
  }

  function drawChar(s: Stick) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.scale(s.sx, s.sy);
    ctx.beginPath();
    ctx.moveTo(-18, 8);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-2, -16);
    ctx.lineTo(10, -12);
    ctx.lineTo(18, -2);
    ctx.lineTo(14, 12);
    ctx.lineTo(0, 16);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    const g = ctx.createLinearGradient(-18, -16, 18, 16);
    g.addColorStop(0, "#3a322c");
    g.addColorStop(0.5, "#1a1410");
    g.addColorStop(1, "#0e0b09");
    ctx.fillStyle = g;
    ctx.fill();
    const flick = 0.4 + 0.6 * Math.sin(time * 16 + s.id);
    ctx.strokeStyle = `rgba(255, 106, 42, ${0.4 + flick * 0.5})`;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(0, -4);
    ctx.lineTo(7, 3);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 140, 40, ${flick})`;
    ctx.beginPath();
    ctx.arc(8, -6, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBag() {
    const x = bagX;
    const y = bagTop();
    const w = bagW;
    const h = bagH;
    ctx.save();
    ctx.translate(x, y + h);
    ctx.scale(1 + (1 - squash) * 0.18, squash);
    ctx.translate(-x, -(y + h));
    const topW = w;
    const botW = w * 0.78;
    const top = y + 12;
    const bot = y + h;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x + 6, bot + 4, botW * 0.46, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - topW / 2, top);
    ctx.lineTo(x + topW / 2, top);
    ctx.lineTo(x + botW / 2, bot);
    ctx.lineTo(x - botW / 2, bot);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - topW / 2, 0, x + topW / 2, 0);
    g.addColorStop(0, "#a88458");
    g.addColorStop(0.28, "#e7d3a8");
    g.addColorStop(0.48, "#f6e6c8");
    g.addColorStop(1, "#8d6844");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 52, 24, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, top + 4);
    ctx.lineTo(x, bot - 8);
    ctx.stroke();
    ctx.fillStyle = "#140a08";
    ctx.beginPath();
    ctx.ellipse(x, top, topW * 0.44, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, top, topW * 0.5, 15, 0, 0, Math.PI * 2);
    ctx.strokeStyle = combo >= 5 ? "#f0b429" : "#f3e2c4";
    ctx.lineWidth = combo >= 8 ? 4 : 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(120, 70, 30, 0.16)";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.12, y + h * 0.62, 14, 9, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHood() {
    const { hoodX: x, hoodY: y, hoodW: w, hoodH: h } = layout;
    const rushing = time < rushUntil;
    const pulse = 0.75 + 0.25 * Math.sin(time * (rushing ? 9 : 3));
    ctx.save();
    const glow = ctx.createRadialGradient(x + w / 2, y + h, 10, x + w / 2, y + h + 40, w * 0.7);
    glow.addColorStop(0, `rgba(255, 106, 42, ${0.28 * pulse})`);
    glow.addColorStop(1, "rgba(255, 106, 42, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 40, y, w + 80, 220);
    ctx.fillStyle = "#24120e";
    round(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = "#3a2018";
    round(ctx, x + 6, y + 6, w - 12, h - 10, 8);
    ctx.fill();
    const mouth = ctx.createLinearGradient(0, y, 0, y + h);
    mouth.addColorStop(0, "#1a0a06");
    mouth.addColorStop(1, `rgba(255, 90, 30, ${0.55 * pulse})`);
    ctx.fillStyle = mouth;
    round(ctx, x + 18, y + 16, w - 36, h - 8, 8);
    ctx.fill();
    ctx.fillStyle = "#fff4e8";
    ctx.font = "18px Anton, Impact, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PEPPERONI RAIN", x + w / 2, y + h * 0.38);
    ctx.fillStyle = "#f0b429";
    ctx.font = "600 10px Outfit, sans-serif";
    ctx.fillText("HALIFAX  ·  MAPLE SMOKE", x + w / 2, y + h * 0.72);
    ctx.restore();
  }

  function drawHangers() {
    const margin = layout.laneX;
    if (margin < 36) return;
    const y = 120;
    for (let i = 0; i < 4; i++) {
      const x = 28 + i * Math.max(36, (margin - 20) / 3);
      const x2 = layout.w - x;
      for (const hx of [x, x2]) {
        const sway = Math.sin(time * 0.8 + i + hx) * (reduce ? 0 : 0.08);
        ctx.save();
        ctx.translate(hx, y);
        ctx.rotate(sway);
        ctx.globalAlpha = 0.45;
        round(ctx, -5, 0, 10, 84, 3);
        ctx.fillStyle = "#4a1a14";
        ctx.fill();
        ctx.strokeStyle = "rgba(20, 6, 4, 0.45)";
        ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.moveTo(-4, 10 + k * 14);
          ctx.lineTo(4, 13 + k * 14);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  function drawHud() {
    const row = layout.hoodY + layout.hoodH + 14;
    const left = layout.laneX + 16;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(left + i * 26, row + 8);
      ctx.rotate(-0.4);
      round(ctx, -3.5, -16, 7, 32, 2);
      ctx.fillStyle = i < lives ? "#5c2218" : "rgba(255,244,232,0.18)";
      ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const sx = layout.laneX + layout.laneW - 16;
    ctx.save();
    ctx.translate(sx, row + 6);
    ctx.scale(scorePop, scorePop);
    ctx.fillStyle = "#fff4e8";
    ctx.font = "44px Anton, Impact, sans-serif";
    ctx.fillText(String(score), 0, 0);
    ctx.restore();
    ctx.fillStyle = "#d7c3ae";
    ctx.font = "12px Outfit, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(`BEST ${best}`, sx, row + 28);
    if (combo >= 2 && !over) {
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#f0b429";
      ctx.font = "26px Anton, Impact, sans-serif";
      ctx.fillText(`x${combo}`, left, row + 28);
    }
    if (banner > 0 && !over) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, banner * 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff6a2a";
      ctx.font = "40px Anton, Impact, sans-serif";
      ctx.fillText("FRESH BATCH", laneCenter(), layout.hoodY + layout.hoodH + 78);
      ctx.restore();
    }
    if (hint > 0.03 && !over) {
      const y = bagTop() - 36;
      const bob = Math.sin(time * 5) * 6;
      ctx.save();
      ctx.globalAlpha = hint;
      ctx.translate(laneCenter(), y);
      chevron(ctx, -78 - bob, 0, -1);
      chevron(ctx, 78 + bob, 0, 1);
      ctx.fillStyle = "#fff4e8";
      ctx.strokeStyle = "rgba(20, 8, 6, 0.65)";
      ctx.lineWidth = 5;
      ctx.font = "40px Anton, Impact, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText("SLIDE", 0, 0);
      ctx.fillText("SLIDE", 0, 0);
      ctx.restore();
    }
    for (const f of floaters) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 1.6));
      ctx.textAlign = "center";
      ctx.fillStyle = f.color;
      ctx.font = f.big ? "32px Anton, Impact, sans-serif" : "20px Anton, Impact, sans-serif";
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  function drawOver() {
    if (!over) return;
    ctx.fillStyle = "rgba(12, 6, 4, 0.55)";
    ctx.fillRect(0, 0, layout.w, layout.h);
    const cw = Math.min(340, layout.laneW - 28);
    const ch = 250;
    const x = laneCenter() - cw / 2;
    const y = layout.h * 0.33;
    round(ctx, x, y, cw, ch, 18);
    ctx.fillStyle = "#2a1410";
    ctx.fill();
    ctx.strokeStyle = "rgba(231, 211, 168, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#f0b429";
    ctx.font = "18px Outfit, sans-serif";
    ctx.fillText("SMOKE'S OUT", laneCenter(), y + 42);
    ctx.fillStyle = "#fff4e8";
    ctx.font = "72px Anton, Impact, sans-serif";
    ctx.fillText(String(score), laneCenter(), y + 118);
    ctx.fillStyle = newBest ? "#f0b429" : "#d7c3ae";
    ctx.font = "16px Outfit, sans-serif";
    ctx.fillText(newBest ? "NEW BEST" : `BEST ${best}`, laneCenter(), y + 156);
    const pulse = 0.55 + 0.45 * Math.sin(time * 5);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#fff4e8";
    ctx.font = "22px Anton, Impact, sans-serif";
    ctx.fillText("TAP ANYWHERE", laneCenter(), y + 206);
    ctx.globalAlpha = 1;
  }

  function draw() {
    const shake = reduce ? 0 : trauma * trauma;
    const ox = (hash(time * 90) - 0.5) * 16 * shake;
    const oy = (hash(time * 70 + 3) - 0.5) * 10 * shake;
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    ctx.clearRect(0, 0, layout.w, layout.h);
    ctx.save();
    ctx.translate(ox, oy);
    if (bg) ctx.drawImage(bg, 0, 0, layout.w, layout.h);
    drawHangers();
    for (const p of particles) {
      if (p.color.startsWith("230,")) {
        ctx.beginPath();
        const a = Math.max(0, (p.life / p.max) * 0.16);
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grd.addColorStop(0, `rgba(${p.color}, ${a})`);
        grd.addColorStop(1, `rgba(${p.color}, 0)`);
        ctx.fillStyle = grd;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    drawHood();
    for (const d of decals) {
      ctx.save();
      ctx.globalAlpha = d.a;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const s of sticks) {
      if (s.phase !== "eat") drawStick(s);
    }
    for (const s of sticks) {
      if (s.phase === "eat") drawStick(s);
    }
    drawBag();
    for (const p of particles) {
      if (p.color.startsWith("230,")) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    if (flash > 0) {
      ctx.fillStyle = `rgba(${flashColor}, ${flash * 0.28})`;
      ctx.fillRect(0, 0, layout.w, layout.h);
    }
    drawHud();
    drawOver();
  }

  function frame(now: number) {
    const raw = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) {
      acc += raw;
      if (acc > 0.25) acc = 0.25;
      const step = 1 / 60;
      while (acc >= step) {
        tick(step);
        acc -= step;
      }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === " ") e.preventDefault();
    if (over) {
      if (!e.repeat) restart();
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      keys.left = true;
      if (mode !== "keys") {
        if (mode === "auto") shield = Math.max(shield, 0.55);
        mode = "keys";
        unlock();
      }
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      keys.right = true;
      if (mode !== "keys") {
        if (mode === "auto") shield = Math.max(shield, 0.55);
        mode = "keys";
        unlock();
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  }

  function onPointerDown(e: PointerEvent) {
    if (over) {
      restart();
      takeOver(e.clientX);
      return;
    }
    takeOver(e.clientX);
  }

  function onPointerMove(e: PointerEvent) {
    if (over) return;
    if (e.pointerType === "mouse" && mode === "auto") {
      if (Number.isNaN(lastMouse)) {
        lastMouse = e.clientX;
        return;
      }
      if (Math.abs(e.clientX - lastMouse) < 12) {
        lastMouse = e.clientX;
        return;
      }
    }
    lastMouse = e.clientX;
    if (mode === "keys" && e.pointerType === "mouse") return;
    takeOver(e.clientX);
  }

  function onTouchMove(e: TouchEvent) {
    if (e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (!t || over) return;
    takeOver(t.clientX);
  }

  function onVis() {
    paused = document.hidden;
    last = performance.now();
    acc = 0;
  }

  resize();
  seedWorld();
  void document.fonts?.load('22px Anton');
  void document.fonts?.load('16px Outfit');

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("visibilitychange", onVis);
  const ro = new ResizeObserver(() => resize());
  ro.observe(host);
  raf = requestAnimationFrame(frame);

  const debug = {
    get: () => ({
      score,
      best,
      lives,
      over,
      mode,
      bagX,
      width: layout.w,
      laneX: layout.laneX,
      laneW: layout.laneW,
      sticks: sticks.length,
      time,
    }),
  };
  (window as unknown as { __pepperoni?: typeof debug }).__pepperoni = debug;

  return {
    setMuted(next: boolean) {
      muted = next;
      if (!next) unlock();
    },
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("visibilitychange", onVis);
      const w = window as unknown as { __pepperoni?: typeof debug };
      if (w.__pepperoni === debug) delete w.__pepperoni;
    },
  };
}

function stickOutline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  round(ctx, -w / 2, -h / 2, w, h, 3);
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shade(hex: string, amt: number): string {
  const n = hex.replace("#", "");
  const num = parseInt(n, 16);
  const r = clamp(((num >> 16) & 255) + amt, 0, 255);
  const g = clamp(((num >> 8) & 255) + amt, 0, 255);
  const b = clamp((num & 255) + amt, 0, 255);
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

function chevron(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - 16);
  ctx.lineTo(x + dir * 16, y);
  ctx.lineTo(x, y + 16);
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#fff4e8";
  ctx.stroke();
}
