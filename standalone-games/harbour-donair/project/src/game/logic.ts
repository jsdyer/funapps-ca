export const SHIFT_SECONDS = 90;
export const DOUGH_MIN = 0.72;
export const DOUGH_MAX = 1.08;
export const DOUGH_IDEAL = 0.9;
export const GOLD_MIN = 0.56;
export const GOLD_MAX = 0.82;

export const STEPS = ["dough", "meat", "cheese", "garden", "oven", "sauce"] as const;
export type Step = (typeof STEPS)[number];
export type Grade = "PERFECT" | "TASTY" | "DECENT" | "MESSY";
export type ToppingKind = "meat" | "tomato" | "onion" | "cheese";

export type Topping = {
  kind: ToppingKind;
  x: number;
  y: number;
  rot: number;
  variant: number;
  scale: number;
  born: number;
};

export type Pt = { x: number; y: number };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: "flour" | "steam" | "spark";
};

export type ShiftResult = {
  pizzas: number;
  tips: number;
  perfects: number;
  bestCombo: number;
  rank: string;
};

export type Sim = {
  phase: "menu" | "play" | "results";
  paused: boolean;
  step: Step;
  t: number;
  timeLeft: number;
  pizzas: number;
  perfects: number;
  tips: number;
  combo: number;
  bestCombo: number;
  doughStretch: number;
  doughSet: boolean;
  doughHolding: boolean;
  setOnUp: boolean;
  toppings: Topping[];
  cheeseShakes: number;
  sauce: Pt[];
  saucing: boolean;
  bake: number;
  bakeSet: number | null;
  goldChimed: boolean;
  delay: number;
  delayKind: "next" | "reset" | null;
  serve: number;
  banner: string;
  bannerSub: string;
  bannerTone: "good" | "bad" | "gold";
  bannerLife: number;
  particles: Particle[];
  trauma: number;
  events: string[];
  grades: Grade[];
  shake: boolean;
  reduced: boolean;
  result: ShiftResult | null;
  rng: number;
  steam: number;
  id: number;
};

export type Snapshot = {
  phase: Sim["phase"];
  paused: boolean;
  step: Step;
  timeLeft: number;
  pizzas: number;
  tips: number;
  combo: number;
  bestCombo: number;
  perfects: number;
  doughStretch: number;
  doughSet: boolean;
  doughGood: boolean;
  meatCount: number;
  meatScore: number;
  cheeseScore: number;
  tomato: number;
  onion: number;
  gardenScore: number;
  bake: number;
  bakeSet: boolean;
  inGold: boolean;
  sauceScore: number;
  banner: string;
  bannerSub: string;
  bannerTone: Sim["bannerTone"];
  grades: Grade[];
  result: ShiftResult | null;
  stepScore: number;
  busy: boolean;
};

function rnd(sim: Sim) {
  sim.rng = (sim.rng * 16807) % 2147483647;
  if (sim.rng <= 0) sim.rng += 2147483646;
  return sim.rng / 2147483647;
}

export function createSim(seed = 1): Sim {
  return {
    phase: "menu",
    paused: false,
    step: "dough",
    t: 0,
    timeLeft: SHIFT_SECONDS,
    pizzas: 0,
    perfects: 0,
    tips: 0,
    combo: 0,
    bestCombo: 0,
    doughStretch: 0.2,
    doughSet: false,
    doughHolding: false,
    setOnUp: false,
    toppings: [],
    cheeseShakes: 0,
    sauce: [],
    saucing: false,
    bake: 0,
    bakeSet: null,
    goldChimed: false,
    delay: 0,
    delayKind: null,
    serve: 0,
    banner: "",
    bannerSub: "",
    bannerTone: "good",
    bannerLife: 0,
    particles: [],
    trauma: 0,
    events: [],
    grades: [],
    shake: true,
    reduced: false,
    result: null,
    rng: seed || 1,
    steam: 0,
    id: 0,
  };
}

export function doughInZone(v: number) {
  return v >= DOUGH_MIN && v <= DOUGH_MAX;
}

export function bakeInGold(b: number) {
  return b >= GOLD_MIN && b <= GOLD_MAX;
}

export function scoreDough(size: number) {
  const d = Math.abs(size - DOUGH_IDEAL);
  if (d <= 0.06) return 100;
  if (d <= 0.14) return 88;
  if (d <= 0.24) return 70;
  if (d <= 0.36) return 48;
  return 28;
}

export function ovenSpeed(pizzasMade: number) {
  return 0.155 + Math.min(8, pizzasMade) * 0.016;
}

export function scoreBake(b: number) {
  const peak = (GOLD_MIN + GOLD_MAX) / 2;
  if (b >= GOLD_MIN && b <= GOLD_MAX) {
    const d = Math.abs(b - peak) / ((GOLD_MAX - GOLD_MIN) / 2);
    return Math.round(100 - d * 14);
  }
  if (b < GOLD_MIN) return Math.max(8, Math.round(70 - (GOLD_MIN - b) * 120));
  return Math.max(5, Math.round(64 - (b - GOLD_MAX) * 210));
}

function sectorIndex(x: number, y: number, sectors: number) {
  const ang = Math.atan2(y, x);
  return Math.floor((((ang + Math.PI) / (Math.PI * 2)) * sectors) % sectors);
}

export function scoreMeat(toppings: Topping[]) {
  const meats = toppings.filter((t) => t.kind === "meat");
  if (meats.length === 0) return 0;
  const sectors = 8;
  const hit = Array.from({ length: sectors }, () => false);
  let outside = 0;
  for (const m of meats) {
    const r = Math.hypot(m.x, m.y);
    if (r > 0.95) outside += 1;
    hit[sectorIndex(m.x, m.y, sectors)] = true;
  }
  const covered = hit.filter(Boolean).length / sectors;
  const amount = Math.min(1, meats.length / 6);
  return Math.max(0, Math.round((amount * 0.48 + covered * 0.52 - outside * 0.06) * 100));
}

export function scoreCheese(toppings: Topping[]) {
  const bits = toppings.filter((t) => t.kind === "cheese");
  if (bits.length === 0) return 0;
  const sectors = 8;
  const hit = new Set<number>();
  for (const c of bits) {
    const r = Math.hypot(c.x, c.y);
    if (r > 1.02) continue;
    const ring = r < 0.46 ? 0 : 1;
    hit.add(ring * sectors + sectorIndex(c.x, c.y, sectors));
  }
  const coverage = hit.size / (sectors * 2);
  const amount = Math.min(1, bits.length / 16);
  return Math.round(Math.min(1, coverage * 0.72 + amount * 0.38) * 100);
}

export function scoreGarden(toppings: Topping[]) {
  const tomato = toppings.filter((t) => t.kind === "tomato").length;
  const onion = toppings.filter((t) => t.kind === "onion").length;
  if (tomato + onion === 0) return 0;
  const both = tomato > 0 && onion > 0 ? 1 : 0.4;
  const ts = Math.min(1, tomato / 4);
  const os = Math.min(1, onion / 4);
  return Math.round(both * (ts * 50 + os * 50));
}

export function scoreSauce(points: Pt[]) {
  if (points.length < 4) return 0;
  const sectors = 8;
  const hit = new Set<number>();
  let len = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (Math.hypot(p.x, p.y) <= 1.05) hit.add(sectorIndex(p.x, p.y, sectors));
    if (i > 0) {
      const q = points[i - 1];
      len += Math.hypot(p.x - q.x, p.y - q.y);
    }
  }
  const spread = hit.size / sectors;
  const lengthScore = Math.min(1, len / 2.2);
  return Math.round(Math.min(1, spread * 0.62 + lengthScore * 0.48) * 100);
}

export function gradeOf(score: number): Grade {
  if (score >= 88) return "PERFECT";
  if (score >= 72) return "TASTY";
  if (score >= 50) return "DECENT";
  return "MESSY";
}

export function rankFor(n: number) {
  if (n >= 11) return "Legend of the harbour";
  if (n >= 8) return "Counter on fire";
  if (n >= 6) return "Saturday-night cook";
  if (n >= 4) return "Solid shift";
  if (n >= 2) return "Finding the rhythm";
  return "Oven's still warming";
}

function count(sim: Sim, kind: ToppingKind) {
  let n = 0;
  for (const t of sim.toppings) if (t.kind === kind) n += 1;
  return n;
}

function burst(sim: Sim, kind: Particle["kind"], n: number) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(sim) * Math.PI * 2;
    const sp = kind === "steam" ? 0.12 + rnd(sim) * 0.18 : 0.35 + rnd(sim) * 0.7;
    const life = 0.35 + rnd(sim) * 0.45;
    sim.particles.push({
      x: Math.cos(ang) * (kind === "steam" ? 0.45 : 0.08),
      y: Math.sin(ang) * (kind === "steam" ? 0.2 : 0.08) - (kind === "steam" ? 0.2 : 0),
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp * 0.6 - (kind === "steam" ? 0.35 : 0.05),
      life,
      max: life,
      size: kind === "spark" ? 3 + rnd(sim) * 3 : 4 + rnd(sim) * 6,
      kind,
    });
  }
  if (sim.particles.length > 80) sim.particles.splice(0, sim.particles.length - 80);
}

function pizzaScore(sim: Sim) {
  const parts = [
    sim.doughSet ? scoreDough(sim.doughStretch) : 0,
    scoreMeat(sim.toppings),
    scoreCheese(sim.toppings),
    scoreGarden(sim.toppings),
    sim.bakeSet == null ? 0 : scoreBake(sim.bakeSet),
    scoreSauce(sim.sauce),
  ];
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export function currentStepScore(sim: Sim) {
  switch (sim.step) {
    case "dough":
      return sim.doughSet || doughInZone(sim.doughStretch)
        ? scoreDough(sim.doughStretch)
        : Math.max(0, Math.round(70 - Math.abs(sim.doughStretch - DOUGH_IDEAL) * 90));
    case "meat":
      return scoreMeat(sim.toppings);
    case "cheese":
      return scoreCheese(sim.toppings);
    case "garden":
      return scoreGarden(sim.toppings);
    case "oven":
      return scoreBake(sim.bakeSet ?? sim.bake);
    case "sauce":
      return scoreSauce(sim.sauce);
  }
}

function resetPie(sim: Sim) {
  sim.step = "dough";
  sim.doughStretch = 0.2;
  sim.doughSet = false;
  sim.doughHolding = false;
  sim.setOnUp = false;
  sim.toppings = [];
  sim.cheeseShakes = 0;
  sim.sauce = [];
  sim.saucing = false;
  sim.bake = 0;
  sim.bakeSet = null;
  sim.goldChimed = false;
  sim.serve = 0;
  sim.banner = "";
  sim.bannerSub = "";
  if (sim.timeLeft <= 0) endShift(sim);
}

function endShift(sim: Sim) {
  if (sim.phase !== "play") return;
  sim.phase = "results";
  sim.paused = false;
  sim.doughHolding = false;
  sim.saucing = false;
  sim.result = {
    pizzas: sim.pizzas,
    tips: sim.tips,
    perfects: sim.perfects,
    bestCombo: sim.bestCombo,
    rank: rankFor(sim.pizzas),
  };
  sim.events.push("end");
}

let shiftSeq = 1;

export function startShift(sim: Sim) {
  const shake = sim.shake;
  const reduced = sim.reduced;
  const rng = (sim.rng + 17) % 2147483647;
  const next = createSim(rng || 1);
  next.phase = "play";
  next.shake = shake;
  next.reduced = reduced;
  next.id = shiftSeq++;
  Object.assign(sim, next);
  sim.events.push("ui");
}

export function doughPointerDown(sim: Sim) {
  if (sim.phase !== "play" || sim.paused || sim.step !== "dough" || sim.doughSet || sim.delay > 0) {
    return;
  }
  if (doughInZone(sim.doughStretch)) {
    sim.setOnUp = true;
    return;
  }
  sim.doughHolding = true;
  sim.doughStretch = Math.min(1.34, sim.doughStretch + 0.075);
  sim.events.push("stretch");
}

export function doughPointerUp(sim: Sim, held: number) {
  const wasHolding = sim.doughHolding;
  const armSet = sim.setOnUp;
  sim.doughHolding = false;
  sim.setOnUp = false;
  if (sim.phase !== "play" || sim.step !== "dough" || sim.doughSet || sim.paused) return;
  const inZone = doughInZone(sim.doughStretch);
  const longHold = wasHolding && held >= 0.22 && sim.doughStretch >= 0.5;
  if ((armSet || inZone || longHold) && sim.doughStretch >= 0.48) lockDough(sim);
}

export function lockDough(sim: Sim) {
  if (sim.doughSet || sim.step !== "dough" || sim.phase !== "play") return;
  sim.doughSet = true;
  sim.doughHolding = false;
  sim.events.push("lock");
  burst(sim, "flour", 14);
  if (!sim.reduced) sim.trauma = Math.min(1, sim.trauma + 0.28);
  sim.delay = sim.reduced ? 0.2 : 0.4;
  sim.delayKind = "next";
}

export function slapMeat(sim: Sim, at?: Pt) {
  if (sim.step !== "meat" || sim.paused || sim.delay > 0 || sim.phase !== "play") return;
  const n = count(sim, "meat");
  if (n >= 8) return;
  let x: number;
  let y: number;
  if (at && Math.hypot(at.x, at.y) <= 1.05) {
    x = at.x;
    y = at.y;
  } else {
    const ang = -Math.PI / 2 + n * 2.399963;
    const ring = n % 2 === 0 ? 0.36 : 0.64;
    x = Math.cos(ang) * ring;
    y = Math.sin(ang) * ring;
  }
  sim.toppings.push({
    kind: "meat",
    x,
    y,
    rot: rnd(sim) * Math.PI * 2,
    variant: n % 2,
    scale: 0.9 + rnd(sim) * 0.22,
    born: sim.t,
  });
  sim.events.push("slap");
  if (!sim.reduced) sim.trauma = Math.min(1, sim.trauma + 0.12);
}

export function shakeCheese(sim: Sim) {
  if (sim.step !== "cheese" || sim.paused || sim.delay > 0 || sim.phase !== "play") return;
  if (count(sim, "cheese") >= 32) return;
  const base = sim.cheeseShakes;
  for (let i = 0; i < 7; i++) {
    const ang = base * 0.9 + (i / 7) * Math.PI * 2;
    const r = 0.2 + (i % 3) * 0.22;
    sim.toppings.push({
      kind: "cheese",
      x: Math.cos(ang) * r + (rnd(sim) - 0.5) * 0.05,
      y: Math.sin(ang) * r + (rnd(sim) - 0.5) * 0.05,
      rot: rnd(sim) * Math.PI,
      variant: 0,
      scale: 0.8 + rnd(sim) * 0.4,
      born: sim.t,
    });
  }
  sim.cheeseShakes += 1;
  sim.events.push("shake");
}

export function sprinkleCheese(sim: Sim, at: Pt) {
  if (sim.step !== "cheese" || sim.paused || sim.phase !== "play") return;
  if (Math.hypot(at.x, at.y) > 1.05) return;
  if (count(sim, "cheese") >= 36) return;
  sim.toppings.push({
    kind: "cheese",
    x: at.x,
    y: at.y,
    rot: rnd(sim) * Math.PI,
    variant: 0,
    scale: 0.7 + rnd(sim) * 0.35,
    born: sim.t,
  });
}

export function tossGarden(sim: Sim, kind: "tomato" | "onion", at?: Pt) {
  if (sim.step !== "garden" || sim.paused || sim.delay > 0 || sim.phase !== "play") return;
  const n = count(sim, kind);
  if (n >= 8) return;
  let x: number;
  let y: number;
  if (at && Math.hypot(at.x, at.y) <= 1.05) {
    x = at.x;
    y = at.y;
  } else {
    const ang = n * 1.9 + (kind === "onion" ? 0.6 : 0.1);
    const r = 0.26 + (n % 4) * 0.16;
    x = Math.cos(ang) * r;
    y = Math.sin(ang) * r;
  }
  sim.toppings.push({
    kind,
    x,
    y,
    rot: rnd(sim) * Math.PI * 2,
    variant: 0,
    scale: 0.85 + rnd(sim) * 0.3,
    born: sim.t,
  });
  sim.events.push("toss");
}

export function goNext(sim: Sim) {
  if (sim.delay > 0 || sim.paused || sim.phase !== "play") return;
  if (sim.step === "dough" && !sim.doughSet) return;
  if (sim.step === "sauce") {
    sendPizza(sim);
    return;
  }
  const i = STEPS.indexOf(sim.step);
  if (i < STEPS.length - 1) {
    sim.step = STEPS[i + 1];
    sim.events.push("ui");
  }
}

export function pullOven(sim: Sim) {
  if (sim.step !== "oven" || sim.bakeSet != null || sim.paused || sim.phase !== "play") return;
  if (sim.bake < 0.22) return;
  sim.bakeSet = Math.min(1, sim.bake);
  const score = scoreBake(sim.bakeSet);
  sim.events.push(score >= 84 ? "pull-good" : "pull-bad");
  if (score >= 84 && !sim.reduced) sim.trauma = Math.min(1, sim.trauma + 0.4);
  sim.delay = sim.reduced ? 0.16 : 0.32;
  sim.delayKind = "next";
}

export function zigzag(): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    pts.push({
      x: -0.72 + t * 1.44,
      y: Math.sin(t * Math.PI * 4) * 0.55,
    });
  }
  return pts;
}

export function houseSauce(sim: Sim) {
  if (sim.step !== "sauce" || sim.paused || sim.phase !== "play") return;
  sim.sauce = zigzag();
  sim.saucing = false;
  sim.events.push("shake");
}

export function sauceStart(sim: Sim, at: Pt) {
  if (sim.step !== "sauce" || sim.paused || sim.phase !== "play") return;
  sim.saucing = true;
  sim.sauce = [];
  if (Math.hypot(at.x, at.y) <= 1.12) sim.sauce.push(at);
}

export function sauceAdd(sim: Sim, at: Pt) {
  if (!sim.saucing || sim.step !== "sauce") return;
  if (Math.hypot(at.x, at.y) > 1.15) return;
  const last = sim.sauce[sim.sauce.length - 1];
  if (last && Math.hypot(last.x - at.x, last.y - at.y) < 0.028) return;
  if (sim.sauce.length > 380) return;
  sim.sauce.push(at);
}

export function sauceEnd(sim: Sim) {
  sim.saucing = false;
}

export function sendPizza(sim: Sim) {
  if (sim.step !== "sauce" || sim.delay > 0 || sim.paused || sim.phase !== "play") return;
  const score = pizzaScore(sim);
  const grade = gradeOf(score);
  if (grade === "PERFECT" || grade === "TASTY") sim.combo += 1;
  else if (grade === "MESSY") sim.combo = 0;
  if (sim.combo > sim.bestCombo) sim.bestCombo = sim.combo;
  const mult = 1 + Math.max(0, sim.combo - 1) * 0.22;
  const dollars = (score / 100) * 7.25 * mult;
  sim.tips += dollars;
  sim.pizzas += 1;
  if (grade === "PERFECT") {
    sim.perfects += 1;
    sim.events.push("perfect");
    burst(sim, "spark", 16);
    if (!sim.reduced) sim.trauma = Math.min(1, sim.trauma + 0.55);
  } else sim.events.push("send");
  sim.grades.push(grade);
  sim.banner = grade;
  sim.bannerSub =
    sim.combo >= 2 && grade !== "MESSY" ? `Combo ×${sim.combo}` : money(dollars);
  sim.bannerTone = grade === "MESSY" ? "bad" : grade === "PERFECT" ? "gold" : "good";
  sim.bannerLife = 0.95;
  sim.serve = 0.001;
  sim.delay = sim.reduced ? 0.45 : 0.92;
  sim.delayKind = "reset";
}

export function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function tick(sim: Sim, dtIn: number) {
  if (sim.phase !== "play" || sim.paused) return;
  const dt = Math.min(0.05, dtIn);
  sim.t += dt;

  if (sim.bannerLife > 0) {
    sim.bannerLife -= dt;
    if (sim.bannerLife <= 0) {
      sim.banner = "";
      sim.bannerSub = "";
    }
  }

  if (sim.doughHolding && !sim.doughSet && sim.step === "dough") {
    sim.doughStretch = Math.min(1.34, sim.doughStretch + dt * 0.5);
  }

  if (sim.step === "oven" && sim.bakeSet == null && sim.delay <= 0) {
    sim.bake = Math.min(1, sim.bake + dt * ovenSpeed(sim.pizzas));
    if (!sim.goldChimed && bakeInGold(sim.bake)) {
      sim.goldChimed = true;
      sim.events.push("gold");
    }
    sim.steam += dt;
    if (sim.steam > 0.22) {
      sim.steam = 0;
      burst(sim, "steam", 1);
    }
    if (sim.bake >= 1) pullOven(sim);
  }

  if (sim.delayKind !== "reset") {
    const prevBucket = Math.ceil(sim.timeLeft);
    sim.timeLeft -= dt;
    const nextBucket = Math.ceil(sim.timeLeft);
    if (sim.timeLeft < 5 && sim.timeLeft > 0 && nextBucket !== prevBucket) {
      sim.events.push("tick");
    }
    if (sim.timeLeft <= 0) {
      sim.timeLeft = 0;
      endShift(sim);
      return;
    }
  } else {
    const total = sim.reduced ? 0.45 : 0.92;
    sim.serve = 1 - Math.max(0, sim.delay) / total;
  }

  if (sim.delay > 0) {
    sim.delay -= dt;
    if (sim.delay <= 0) {
      const kind = sim.delayKind;
      sim.delay = 0;
      sim.delayKind = null;
      if (kind === "next") goNext(sim);
      else if (kind === "reset") resetPie(sim);
    }
  }

  for (const p of sim.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === "steam") p.vy -= 0.25 * dt;
    else p.vy += 1.3 * dt;
  }
  if (sim.particles.length) sim.particles = sim.particles.filter((p) => p.life > 0);

  if (sim.shake && !sim.reduced) sim.trauma = Math.max(0, sim.trauma - dt * 1.7);
  else sim.trauma = 0;
}

export function snapshot(sim: Sim): Snapshot {
  const bake = sim.bakeSet ?? sim.bake;
  return {
    phase: sim.phase,
    paused: sim.paused,
    step: sim.step,
    timeLeft: sim.timeLeft,
    pizzas: sim.pizzas,
    tips: sim.tips,
    combo: sim.combo,
    bestCombo: sim.bestCombo,
    perfects: sim.perfects,
    doughStretch: sim.doughStretch,
    doughSet: sim.doughSet,
    doughGood: doughInZone(sim.doughStretch),
    meatCount: count(sim, "meat"),
    meatScore: scoreMeat(sim.toppings),
    cheeseScore: scoreCheese(sim.toppings),
    tomato: count(sim, "tomato"),
    onion: count(sim, "onion"),
    gardenScore: scoreGarden(sim.toppings),
    bake,
    bakeSet: sim.bakeSet != null,
    inGold: bakeInGold(bake),
    sauceScore: scoreSauce(sim.sauce),
    banner: sim.bannerLife > 0 ? sim.banner : "",
    bannerSub: sim.bannerLife > 0 ? sim.bannerSub : "",
    bannerTone: sim.bannerTone,
    grades: sim.grades.slice(-8),
    result: sim.result,
    stepScore: currentStepScore(sim),
    busy: sim.delay > 0,
  };
}

export const STEP_META: { id: Step; label: string; hint: string }[] = [
  {
    id: "dough",
    label: "Dough",
    hint: "Hold to stretch the dough. Let go when it sits in the gold ring.",
  },
  {
    id: "meat",
    label: "Meat",
    hint: "Lay spiced donair meat in an even layer. Tap the pie or the button.",
  },
  {
    id: "cheese",
    label: "Cheese",
    hint: "Shake on a blanket of mozzarella. Swirl on the pie if you like.",
  },
  {
    id: "garden",
    label: "Garden",
    hint: "Tomato and sweet onion — a donair pizza wants both.",
  },
  {
    id: "oven",
    label: "Oven",
    hint: "Watch the crust. Pull the pie while the marker is in the gold.",
  },
  {
    id: "sauce",
    label: "Sauce",
    hint: "Finish with sweet donair sauce. House zigzag, or draw your own.",
  },
];
