// Top-down parking sim. Yaw 0 faces screen-up (north).
// forward = (-sin(yaw), -cos(yaw)); +yaw turns the nose left.
// KeyA => steer +1 => yaw increases. Do not flip this.

export const STALL_W = 3.05;
export const STALL_H = 5.5;

export const AISLE = { x: 0, y: 5.55, w: 33, h: 5.4 };
export const ROAD = { x: 0, y: 22.45, w: 6.6, h: 28.4 };
export const GRAVEL = { x: 0, y: 5.55, w: 36.2, h: 17.6 };

const NORTH_Y = 0.1;
const SOUTH_Y = 11.0;
const NORTH_XS = [-12.95, -9.25, -5.55, -1.85, 1.85, 5.55, 9.25, 12.95];
const SOUTH_XS = [-15.7, -12.0, -8.3, 8.3, 12.0, 15.7];

export type Stall = {
  id: number;
  x: number;
  y: number;
  yaw: number;
  row: "north" | "south";
};

export type Wall = { x: number; y: number; w: number; h: number };

export const WALLS: Wall[] = [
  { x: 0, y: -3.4, w: 42, h: 0.75 },
  { x: -18.35, y: 6.2, w: 0.85, h: 20.4 },
  { x: 18.35, y: 6.2, w: 0.85, h: 20.4 },
  { x: -12.4, y: 14.55, w: 11.2, h: 0.7 },
  { x: 12.4, y: 14.55, w: 11.2, h: 0.7 },
  { x: -6.85, y: 25.4, w: 0.75, h: 21.6 },
  { x: 6.85, y: 25.4, w: 0.75, h: 21.6 },
  { x: 0, y: 36.85, w: 14.2, h: 0.75 },
];

export type Phase = "menu" | "play" | "win" | "lose";

export type Car = {
  id: number;
  x: number;
  y: number;
  yaw: number;
  speed: number;
  roll: number;
  w: number;
  h: number;
  color: string;
  roof: string;
  glass: string;
  label: string;
  role: "parked" | "leave" | "thief";
  stallId: number;
  path: { x: number; y: number }[] | null;
  pathI: number;
  rv: boolean;
  honk: number;
};

export type Ped = {
  id: number;
  x: number;
  y: number;
  vx: number;
  r: number;
  shirt: string;
  hat: string;
  scared: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  tone: string;
};

export type Skid = { x: number; y: number; life: number };
export type Callout = { x: number; y: number; text: string; life: number };

type GameEvent =
  | { t: number; kind: "say"; text: string }
  | { t: number; kind: "leave"; stall: number }
  | { t: number; kind: "thief"; stall: number }
  | { t: number; kind: "ped"; y: number; dir: 1 | -1 };

export type Sfx = "horn" | "win" | "lose" | "tick" | "thud" | "gull" | "settle";

export type Sim = {
  phase: Phase;
  paused: boolean;
  clock: number;
  time: number;
  limit: number;
  round: number;
  name: string;
  blurb: string;
  stress: number;
  score: number;
  best: number;
  muted: boolean;
  parkHold: number;
  message: string;
  messageT: number;
  tone: "info" | "bad";
  hint: string;
  shake: number;
  resultTitle: string;
  resultBody: string;
  resultGain: number;
  camX: number;
  camY: number;
  player: Car;
  cars: Car[];
  peds: Ped[];
  stalls: Stall[];
  particles: Particle[];
  skids: Skid[];
  callouts: Callout[];
  events: GameEvent[];
  eventI: number;
  sfx: Sfx[];
  keys: Set<string>;
  forcedKeys: Set<string> | null;
  forcedSteer: number | null;
  touchSteer: number;
  touchThrottle: number;
  nextId: number;
  iframes: Record<number, number>;
  sinceHit: number;
  offStop: number;
  offStopFired: boolean;
  offNotedT: number;
  blockT: number;
  blockFired: boolean;
  tickSec: number;
  gullClock: number;
  thiefSpeed: number;
  settlePlayed: boolean;
  lastAlign: number;
};

const BEST_KEY = "last-spot-new-london-v1";
const MUTE_KEY = "last-spot-new-london-mute";

const PAINTS: { color: string; roof: string; glass: string; label: string; van?: boolean }[] = [
  { color: "#f4f1ea", roof: "#d5cec2", glass: "#9ec9d6", label: "white sedan" },
  { color: "#1d3a5f", roof: "#14283f", glass: "#c5e0ea", label: "navy minivan", van: true },
  { color: "#2c6b4a", roof: "#1b4330", glass: "#d5ebdf", label: "green pickup" },
  { color: "#d5dbe0", roof: "#eef2f4", glass: "#9bbfce", label: "silver SUV", van: true },
  { color: "#8e2e28", roof: "#5e1d19", glass: "#f0d2b0", label: "red compact" },
  { color: "#e0a02a", roof: "#f6f1e6", glass: "#f7e7c0", label: "yellow beetle" },
  { color: "#3c4148", roof: "#2a2e33", glass: "#c9d7e0", label: "grey van", van: true },
  { color: "#7a4a32", roof: "#563222", glass: "#ead8c8", label: "brown wagon" },
];

export function makeStalls(): Stall[] {
  const stalls: Stall[] = [];
  let id = 0;
  for (const x of NORTH_XS) stalls.push({ id: id++, x, y: NORTH_Y, yaw: 0, row: "north" });
  for (const x of SOUTH_XS) stalls.push({ id: id++, x, y: SOUTH_Y, yaw: Math.PI, row: "south" });
  return stalls;
}

export function wrap(a: number) {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function readNum(key: string) {
  try {
    if (typeof localStorage === "undefined") return 0;
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeNum(key: string, n: number) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, String(n));
  } catch {
    /* private mode */
  }
}

function roundMeta(round: number) {
  const names = [
    "Tuesday after the rain",
    "The tour-bus hour",
    "Golden hour",
    "Saturday in July",
    "Cruise-ship spillover",
    "The long weekend",
  ];
  const blurbs = [
    "Two stalls are open. They will not stay that way.",
    "A pair of RVs have made the aisle their living room.",
    "Nothing is open until someone leaves. Then everyone moves.",
    "The shoulder looks legal. It is not.",
    "They are coming off the highway in a line.",
    "Dusk is early. The gate does not care.",
  ];
  const i = round - 1;
  return {
    name: names[i] ?? `Evening ${round}`,
    blurb: blurbs[i] ?? "If you see paint, commit. If you don't, don't stop.",
  };
}

function scriptFor(round: number): { limit: number; empty: number[]; rvs: number[]; events: GameEvent[]; thiefSpeed: number } {
  const thiefSpeed = Math.min(7.5, 4.5 + (round - 1) * 0.7);
  if (round === 1) {
    return {
      limit: 80,
      empty: [2, 6],
      rvs: [],
      thiefSpeed,
      events: [
        { t: 0.5, kind: "say", text: "Painted lines only. The shoulder is a tow." },
        { t: 4.2, kind: "leave", stall: 0 },
        { t: 7, kind: "ped", y: 18, dir: 1 },
        { t: 11.5, kind: "thief", stall: 0 },
        { t: 16, kind: "ped", y: 5.55, dir: -1 },
        { t: 24, kind: "ped", y: 23, dir: 1 },
      ],
    };
  }
  if (round === 2) {
    return {
      limit: 70,
      empty: [4],
      rvs: [10, 11],
      thiefSpeed,
      events: [
        { t: 0.4, kind: "say", text: "Those RVs hang into the aisle. Thread it." },
        { t: 3.4, kind: "ped", y: 16, dir: -1 },
        { t: 5, kind: "leave", stall: 1 },
        { t: 9, kind: "ped", y: 5.55, dir: 1 },
        { t: 11.2, kind: "thief", stall: 1 },
        { t: 18, kind: "leave", stall: 7 },
        { t: 20, kind: "ped", y: 26, dir: 1 },
        { t: 24, kind: "thief", stall: 7 },
      ],
    };
  }
  if (round === 3) {
    return {
      limit: 58,
      empty: [],
      rvs: [9, 10, 11, 12],
      thiefSpeed,
      events: [
        { t: 0.35, kind: "say", text: "Nothing is open yet. Wait for brake lights, then go." },
        { t: 2.6, kind: "ped", y: 5.55, dir: 1 },
        { t: 3.1, kind: "leave", stall: 3 },
        { t: 7.4, kind: "thief", stall: 3 },
        { t: 10, kind: "ped", y: 20, dir: -1 },
        { t: 14, kind: "leave", stall: 6 },
        { t: 15.5, kind: "ped", y: 5.55, dir: -1 },
        { t: 18.6, kind: "thief", stall: 6 },
      ],
    };
  }
  const limit = Math.max(46, 84 - (round - 1) * 7);
  const leaveA = (round * 3) % 8;
  const leaveB = 8 + (round % 6);
  const empty = round % 4 === 0 ? [(round * 5) % 8] : [];
  const events: GameEvent[] = [
    { t: 0.3, kind: "say", text: "If you see paint, commit. If you don't, don't stop." },
    { t: 2.3, kind: "leave", stall: leaveA },
    { t: 6.1, kind: "thief", stall: leaveA },
    { t: 11, kind: "leave", stall: leaveB },
    { t: 15.2, kind: "thief", stall: leaveB },
  ];
  const gap = Math.max(3.1, 5.6 - round * 0.25);
  for (let t = 2.2; t < limit - 4; t += gap) {
    events.push({
      t,
      kind: "ped",
      y: Math.round(t) % 2 === 0 ? 5.55 : 17 + (Math.round(t) % 5),
      dir: Math.round(t) % 2 === 0 ? 1 : -1,
    });
  }
  events.sort((a, b) => a.t - b.t);
  return { limit, empty, rvs: [9, 10, 11], events, thiefSpeed };
}

function paintFor(stallId: number, rv: boolean) {
  if (rv) return { color: "#efe6d4", roof: "#f7f4ee", glass: "#c5dbe6", label: "rental RV", van: true };
  return PAINTS[stallId % PAINTS.length]!;
}

function leavePath(stall: Stall) {
  return [
    { x: stall.x, y: AISLE.y },
    { x: stall.x * 0.4, y: AISLE.y },
    { x: 0, y: 13 },
    { x: 0, y: 40 },
  ];
}

function thiefPath(stall: Stall) {
  return [
    { x: 0, y: 33 },
    { x: 0, y: 13.5 },
    { x: stall.x * 0.45, y: AISLE.y },
    { x: stall.x, y: AISLE.y },
    { x: stall.x, y: stall.y },
  ];
}

function makeCar(simLike: { nextId: number }, stall: Stall, rv: boolean): Car {
  const paint = paintFor(stall.id, rv);
  const towardAisle = Math.sign(AISLE.y - stall.y) || 1;
  const h = rv ? 6.35 : paint.van ? 4.85 : 4.15;
  const w = rv ? 2.2 : paint.van ? 1.95 : 1.8;
  return {
    id: simLike.nextId++,
    x: stall.x,
    y: stall.y + (rv ? towardAisle * 0.55 : 0),
    yaw: stall.yaw,
    speed: 0,
    roll: 0,
    w,
    h,
    color: paint.color,
    roof: paint.roof,
    glass: paint.glass,
    label: paint.label,
    role: "parked",
    stallId: stall.id,
    path: null,
    pathI: 0,
    rv,
    honk: 0,
  };
}

function makePlayer(): Car {
  return {
    id: 0,
    x: 0,
    y: 29,
    yaw: 0,
    speed: 0,
    roll: 0,
    w: 1.8,
    h: 4.05,
    color: "#e23b2f",
    roof: "#f7f4ee",
    glass: "#d7eef5",
    label: "your rental",
    role: "parked",
    stallId: -1,
    path: null,
    pathI: 0,
    rv: false,
    honk: 0,
  };
}

function build(round: number): Sim {
  const stalls = makeStalls();
  const script = scriptFor(round);
  const meta = roundMeta(round);
  const next = { nextId: 1 };
  const empty = new Set(script.empty);
  const rvs = new Set(script.rvs);
  const cars = stalls.filter((s) => !empty.has(s.id)).map((s) => makeCar(next, s, rvs.has(s.id)));
  const player = makePlayer();
  return {
    phase: "play",
    paused: false,
    clock: 0,
    time: 0,
    limit: script.limit,
    round,
    name: meta.name,
    blurb: meta.blurb,
    stress: 8,
    score: 0,
    best: 0,
    muted: false,
    parkHold: 0,
    message: "",
    messageT: 0,
    tone: "info",
    hint: "",
    shake: 0,
    resultTitle: "",
    resultBody: "",
    resultGain: 0,
    camX: -6,
    camY: 7,
    player,
    cars,
    peds: [],
    stalls,
    particles: [],
    skids: [],
    callouts: [],
    events: script.events,
    eventI: 0,
    sfx: [],
    keys: new Set(),
    forcedKeys: null,
    forcedSteer: null,
    touchSteer: 0,
    touchThrottle: 0,
    nextId: next.nextId,
    iframes: {},
    sinceHit: 2,
    offStop: 0,
    offStopFired: false,
    offNotedT: 0,
    blockT: 0,
    blockFired: false,
    tickSec: 99,
    gullClock: -20,
    thiefSpeed: script.thiefSpeed,
    settlePlayed: false,
    lastAlign: 1,
  };
}

export function createSim(): Sim {
  const sim = build(1);
  sim.phase = "menu";
  sim.best = readNum(BEST_KEY);
  sim.muted = readNum(MUTE_KEY) === 1;
  return sim;
}

function remember(sim: Sim) {
  return {
    score: sim.score,
    best: sim.best,
    muted: sim.muted,
    keys: sim.keys,
    forcedKeys: sim.forcedKeys,
    forcedSteer: sim.forcedSteer,
    touchSteer: sim.touchSteer,
    touchThrottle: sim.touchThrottle,
    clock: sim.clock,
  };
}

export function loadRound(sim: Sim, round: number) {
  const keep = remember(sim);
  const built = build(round);
  Object.assign(sim, built);
  sim.score = keep.score;
  sim.best = keep.best;
  sim.muted = keep.muted;
  sim.keys = keep.keys;
  sim.forcedKeys = keep.forcedKeys;
  sim.forcedSteer = keep.forcedSteer;
  sim.touchSteer = keep.touchSteer;
  sim.touchThrottle = keep.touchThrottle;
  sim.clock = keep.clock;
  sim.phase = "play";
  sim.paused = false;
  sim.camX = sim.player.x;
  sim.camY = sim.player.y;
}

export function beginGame(sim: Sim) {
  sim.score = 0;
  loadRound(sim, 1);
}

export function nextEvening(sim: Sim) {
  loadRound(sim, sim.round + 1);
}

export function retryEvening(sim: Sim) {
  const score = sim.score;
  loadRound(sim, sim.round);
  sim.score = score;
}

export function toggleMute(sim: Sim) {
  sim.muted = !sim.muted;
  writeNum(MUTE_KEY, sim.muted ? 1 : 0);
}

export function installProbe(sim: Sim) {
  if (typeof window === "undefined") return;
  window.__controlsTest = {
    getYaw: () => sim.player.yaw,
    getSpeed: () => sim.player.speed,
    setKeys: (codes: string[]) => {
      sim.forcedKeys = new Set(codes);
    },
    setSteer: (v: number) => {
      sim.forcedSteer = v;
    },
  };
}

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys?: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

function say(sim: Sim, text: string, tone: "info" | "bad" = "info") {
  sim.message = text;
  sim.messageT = 2.5;
  sim.tone = tone;
}

function callout(sim: Sim, x: number, y: number, text: string) {
  sim.callouts.push({ x, y, text, life: 1.4 });
  if (sim.callouts.length > 6) sim.callouts.shift();
}

function pushSfx(sim: Sim, s: Sfx) {
  sim.sfx.push(s);
  if (sim.sfx.length > 8) sim.sfx.shift();
}

function bank(sim: Sim) {
  if (sim.score > sim.best) {
    sim.best = sim.score;
    writeNum(BEST_KEY, sim.best);
  }
}

function lose(sim: Sim, kind: "time" | "stress") {
  if (sim.phase !== "play") return;
  sim.phase = "lose";
  sim.parkHold = 0;
  if (kind === "time") {
    sim.resultTitle = "Closed.";
    sim.resultBody = "The gate chain is up. You can see the lantern from the road, which is not the same thing.";
  } else {
    sim.resultTitle = "That's enough.";
    sim.resultBody = "Hazards on, aisle blocked, a minivan on the horn. Walk down to the water. The rental can wait.";
  }
  sim.resultGain = 0;
  bank(sim);
  pushSfx(sim, "lose");
  sim.shake = Math.min(1, sim.shake + 0.4);
}

function win(sim: Sim) {
  if (sim.phase !== "play") return;
  const left = Math.max(0, sim.limit - sim.time);
  const alignBonus = Math.round(80 * (1 - clamp(sim.lastAlign / 0.55, 0, 1)));
  const gain = Math.round(160 + left * 8 + (100 - sim.stress) * 2 + alignBonus);
  sim.score += gain;
  sim.resultGain = gain;
  sim.resultTitle = "You're in.";
  sim.resultBody = "The lock hasn't turned. Get out before anyone asks if you're leaving.";
  sim.phase = "win";
  bank(sim);
  pushSfx(sim, "win");
  sim.shake = 0.25;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    sim.particles.push({
      x: sim.player.x,
      y: sim.player.y,
      vx: Math.cos(a) * (1.2 + (i % 3) * 0.4),
      vy: Math.sin(a) * (1.2 + (i % 3) * 0.4),
      life: 0.8,
      max: 0.8,
      tone: i % 2 ? "#e7a323" : "#f3ecdf",
    });
  }
}

export function inRect(x: number, y: number, c: { x: number; y: number; w: number; h: number }) {
  return Math.abs(x - c.x) <= c.w / 2 && Math.abs(y - c.y) <= c.h / 2;
}

export function pointInStall(x: number, y: number, s: Stall, shrink: number) {
  return Math.abs(x - s.x) <= STALL_W / 2 - shrink && Math.abs(y - s.y) <= STALL_H / 2 - shrink;
}

export function onPavement(x: number, y: number, stalls: Stall[]) {
  if (inRect(x, y, AISLE)) return true;
  if (inRect(x, y, ROAD)) return true;
  return stalls.some((s) => pointInStall(x, y, s, 0));
}

function carCorners(c: { x: number; y: number; yaw: number; w: number; h: number }) {
  const fx = -Math.sin(c.yaw);
  const fy = -Math.cos(c.yaw);
  const rx = Math.cos(c.yaw);
  const ry = -Math.sin(c.yaw);
  const hl = c.h / 2;
  const hw = c.w / 2;
  const pts: { x: number; y: number }[] = [];
  for (const sy of [-1, 1]) {
    for (const sx of [-1, 1]) {
      pts.push({
        x: c.x + fx * hl * sy + rx * hw * sx,
        y: c.y + fy * hl * sy + ry * hw * sx,
      });
    }
  }
  return pts;
}

export function fullyInStall(c: { x: number; y: number; yaw: number; w: number; h: number }, s: Stall) {
  return carCorners(c).every((p) => pointInStall(p.x, p.y, s, 0.02));
}

function alignError(yaw: number, stallYaw: number) {
  const d1 = Math.abs(wrap(yaw - stallYaw));
  const d2 = Math.abs(wrap(yaw - stallYaw + Math.PI));
  return Math.min(d1, d2);
}

function npcInStall(sim: Sim, stall: Stall) {
  return sim.cars.some((c) => pointInStall(c.x, c.y, stall, 0));
}

type Body = { x: number; y: number; yaw: number; w: number; h: number };

function project(b: Body, ax: number, ay: number) {
  const c = b.x * ax + b.y * ay;
  const fx = -Math.sin(b.yaw);
  const fy = -Math.cos(b.yaw);
  const rx = Math.cos(b.yaw);
  const ry = -Math.sin(b.yaw);
  const r = Math.abs(rx * ax + ry * ay) * (b.w / 2) + Math.abs(fx * ax + fy * ay) * (b.h / 2);
  return { min: c - r, max: c + r };
}

function obbMTV(a: Body, b: Body) {
  const axes: { x: number; y: number }[] = [];
  for (const body of [a, b]) {
    axes.push({ x: Math.cos(body.yaw), y: -Math.sin(body.yaw) });
    axes.push({ x: -Math.sin(body.yaw), y: -Math.cos(body.yaw) });
  }
  let min = Infinity;
  let nx = 0;
  let ny = 0;
  for (const ax of axes) {
    const pa = project(a, ax.x, ax.y);
    const pb = project(b, ax.x, ax.y);
    const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min);
    if (overlap <= 0) return null;
    if (overlap < min) {
      min = overlap;
      nx = ax.x;
      ny = ax.y;
    }
  }
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  if (dx * nx + dy * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx * min, y: ny * min };
}

function resolveWalls(body: Body & { speed: number }) {
  for (const w of WALLS) {
    const wall: Body = { x: w.x, y: w.y, yaw: 0, w: w.w, h: w.h };
    const mtv = obbMTV(body, wall);
    if (!mtv) continue;
    body.x += mtv.x;
    body.y += mtv.y;
    const n = Math.hypot(mtv.x, mtv.y) || 1;
    const nx = mtv.x / n;
    const ny = mtv.y / n;
    const vx = -Math.sin(body.yaw) * body.speed;
    const vy = -Math.cos(body.yaw) * body.speed;
    if (vx * nx + vy * ny < 0) body.speed *= 0.45;
  }
  if (body.y < -8.2) {
    body.y = -8.2;
    body.speed *= 0.2;
  }
  if (body.x < -24) {
    body.x = -24;
    body.speed *= 0.4;
  }
  if (body.x > 24) {
    body.x = 24;
    body.speed *= 0.4;
  }
}

function hitCars(sim: Sim) {
  const p = sim.player;
  for (const c of sim.cars) {
    const mtv = obbMTV(p, c);
    if (!mtv) continue;
    p.x += mtv.x;
    p.y += mtv.y;
    const cd = sim.iframes[c.id] ?? 0;
    if (cd <= 0) {
      sim.iframes[c.id] = 0.8;
      sim.stress = clamp(sim.stress + 12, 0, 100);
      sim.sinceHit = 0;
      sim.shake = Math.min(1, sim.shake + 0.55);
      p.speed *= 0.5;
      pushSfx(sim, "thud");
      if (sim.messageT < 0.4) say(sim, `That's the ${c.label}.`, "bad");
      callout(sim, c.x, c.y - 1.4, "Hey!");
    }
  }
}

function forwardOf(yaw: number) {
  return { x: -Math.sin(yaw), y: -Math.cos(yaw) };
}

function follow(car: Car, dt: number, speed: number, sim: Sim) {
  if (!car.path) return false;
  let guard = 0;
  while (car.path && car.pathI < car.path.length && guard < 3) {
    const target = car.path[car.pathI]!;
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.42) {
      car.pathI += 1;
      guard += 1;
      continue;
    }
    const desired = Math.atan2(-dx, -dy);
    const diff = wrap(desired - car.yaw);
    const maxTurn = 3.1 * dt;
    car.yaw = wrap(car.yaw + clamp(diff, -maxTurn, maxTurn));
    const f = forwardOf(car.yaw);
    const rx = Math.cos(car.yaw);
    const ry = -Math.sin(car.yaw);
    const pdx = sim.player.x - car.x;
    const pdy = sim.player.y - car.y;
    const ahead = pdx * f.x + pdy * f.y;
    const lateral = Math.abs(pdx * rx + pdy * ry);
    const blocked = ahead > 0 && ahead < 3.4 && lateral < (car.w + sim.player.w) * 0.55;
    if (blocked) {
      car.speed = 0;
      car.honk -= dt;
      if (car.honk <= 0) {
        car.honk = 1.65;
        sim.stress = clamp(sim.stress + 5.5, 0, 100);
        sim.sinceHit = 0;
        pushSfx(sim, "horn");
        callout(sim, car.x, car.y - 1.6, "HONK");
        if (sim.messageT < 0.35) say(sim, "Horn. You are the traffic.", "bad");
      }
      return false;
    }
    const align = Math.max(0, Math.cos(diff));
    const spd = speed * (0.2 + 0.8 * align);
    car.x += f.x * spd * dt;
    car.y += f.y * spd * dt;
    car.speed = spd;
    car.roll += spd * dt;
    return false;
  }
  return !car.path || car.pathI >= car.path.length;
}

function spawnThief(sim: Sim, stallId: number) {
  const stall = sim.stalls[stallId];
  if (!stall) return;
  const paint = PAINTS[(stallId + 3) % PAINTS.length]!;
  const path = thiefPath(stall);
  const car: Car = {
    id: sim.nextId++,
    x: path[0]!.x,
    y: path[0]!.y,
    yaw: 0,
    speed: 0,
    roll: 0,
    w: paint.van ? 1.95 : 1.8,
    h: paint.van ? 4.85 : 4.15,
    color: paint.color,
    roof: paint.roof,
    glass: paint.glass,
    label: paint.label,
    role: "thief",
    stallId,
    path,
    pathI: 1,
    rv: false,
    honk: 0.4,
  };
  sim.cars.push(car);
  say(sim, `A ${paint.label} just turned in. They want a stall.`);
}

function claimStall(sim: Sim, car: Car) {
  const stall = sim.stalls[car.stallId];
  if (!stall) {
    car.role = "leave";
    car.path = [
      { x: 0, y: 14 },
      { x: 0, y: 40 },
    ];
    car.pathI = 0;
    return;
  }
  const playerIn = fullyInStall(sim.player, stall);
  const taken = npcInStall(sim, stall);
  if (playerIn || taken) {
    say(sim, playerIn ? "You beat them to the lines. They can circle." : "That stall's already gone. So are they.");
    car.role = "leave";
    car.path = leavePath(stall);
    car.pathI = 0;
    car.x = stall.x;
    car.y = AISLE.y;
    return;
  }
  car.role = "parked";
  car.path = null;
  car.x = stall.x;
  car.y = stall.y;
  car.yaw = stall.yaw;
  car.speed = 0;
  sim.stress = clamp(sim.stress + 8, 0, 100);
  sim.sinceHit = 0;
  pushSfx(sim, "horn");
  say(sim, `Taken. The ${car.label} nosed in.`, "bad");
  callout(sim, stall.x, stall.y, "TAKEN");
}

function fire(sim: Sim, ev: GameEvent) {
  if (ev.kind === "say") {
    say(sim, ev.text);
    return;
  }
  if (ev.kind === "leave") {
    const car = sim.cars.find((c) => c.role === "parked" && c.stallId === ev.stall);
    const stall = sim.stalls[ev.stall];
    if (!car || !stall) return;
    car.role = "leave";
    car.path = leavePath(stall);
    car.pathI = 0;
    say(sim, `${cap(car.label)} is backing out of the ${stall.row} row.`);
    callout(sim, stall.x, stall.y, "OPENING");
    return;
  }
  if (ev.kind === "thief") {
    spawnThief(sim, ev.stall);
    return;
  }
  const fromLeft = ev.dir > 0;
  sim.peds.push({
    id: sim.nextId++,
    x: fromLeft ? -17.5 : 17.5,
    y: ev.y,
    vx: ev.dir * (1.45 + Math.min(0.7, sim.round * 0.08)),
    r: 0.42,
    shirt: ev.y < 10 ? "#1d6f86" : "#c5362b",
    hat: ev.y < 10 ? "#f3ecdf" : "#1c1915",
    scared: 0,
  });
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function readInput(sim: Sim) {
  const held = sim.forcedKeys ?? sim.keys;
  let steer = 0;
  if (held.has("KeyA") || held.has("ArrowLeft")) steer += 1;
  if (held.has("KeyD") || held.has("ArrowRight")) steer -= 1;
  if (sim.forcedSteer != null) steer = sim.forcedSteer;
  else steer = clamp(steer + sim.touchSteer, -1, 1);
  let throttle = 0;
  if (held.has("KeyW") || held.has("ArrowUp")) throttle += 1;
  if (held.has("KeyS") || held.has("ArrowDown")) throttle -= 1;
  throttle = clamp(throttle + sim.touchThrottle, -1, 1);
  return { steer, throttle };
}

function integratePlayer(sim: Sim, dt: number, steer: number, throttle: number) {
  const p = sim.player;
  if (throttle > 0) p.speed += 16 * throttle * dt;
  else if (throttle < 0) p.speed -= (p.speed > 0.2 ? 20 : 11) * dt;
  else {
    const d = 7.2 * dt;
    if (Math.abs(p.speed) <= d) p.speed = 0;
    else p.speed -= Math.sign(p.speed) * d;
  }
  p.speed = clamp(p.speed, -3.3, 7.2);
  const speedFactor = Math.min(1, Math.abs(p.speed) / 1.5);
  const fastDamp = 1 / (1 + Math.max(0, Math.abs(p.speed) - 3.2) * 0.09);
  const reverse = p.speed >= 0 ? 1 : -1;
  p.yaw = wrap(p.yaw + steer * 2.55 * speedFactor * fastDamp * reverse * dt);
  const f = forwardOf(p.yaw);
  p.x += f.x * p.speed * dt;
  p.y += f.y * p.speed * dt;
  p.roll += p.speed * dt;
  if (Math.abs(steer) > 0.65 && Math.abs(p.speed) > 3.4 && sim.skids.length < 40) {
    const rearX = p.x - f.x * (p.h * 0.35);
    const rearY = p.y - f.y * (p.h * 0.35);
    sim.skids.push({ x: rearX, y: rearY, life: 1.6 });
  }
  if (Math.abs(p.speed) > 2.4 && sim.particles.length < 70 && Math.random() < 0.7) {
    const rearX = p.x - f.x * (p.h * 0.4);
    const rearY = p.y - f.y * (p.h * 0.4);
    sim.particles.push({
      x: rearX,
      y: rearY,
      vx: -f.x * 0.4 + (Math.random() - 0.5),
      vy: -f.y * 0.4 + (Math.random() - 0.5),
      life: 0.35,
      max: 0.35,
      tone: "rgba(80,70,55,0.45)",
    });
  }
}

function updatePeds(sim: Sim, dt: number) {
  for (const ped of sim.peds) {
    ped.scared = Math.max(0, ped.scared - dt);
    ped.x += ped.vx * (ped.scared > 0 ? 1.8 : 1) * dt;
  }
  sim.peds = sim.peds.filter((p) => p.x > -20 && p.x < 20);
  const pl = sim.player;
  for (const ped of sim.peds) {
    const d = Math.hypot(ped.x - pl.x, ped.y - pl.y);
    if (d < 1.15 + ped.r && ped.scared <= 0) {
      ped.scared = 0.85;
      ped.vx *= -1;
      pl.speed *= 0.25;
      sim.stress = clamp(sim.stress + 16, 0, 100);
      sim.sinceHit = 0;
      sim.shake = Math.min(1, sim.shake + 0.7);
      pushSfx(sim, "thud");
      say(sim, "They're crossing. This lane is also a footpath.", "bad");
    }
  }
}

function updateParking(sim: Sim, dt: number) {
  let best: { stall: Stall; err: number; status: "in" | "angle" | "place" | "speed" | "taken" } | null = null;
  let bestD = 4.4;
  for (const stall of sim.stalls) {
    const d = Math.hypot(sim.player.x - stall.x, sim.player.y - stall.y);
    if (d > bestD) continue;
    bestD = d;
    const err = alignError(sim.player.yaw, stall.yaw);
    const taken = npcInStall(sim, stall);
    let status: "in" | "angle" | "place" | "speed" | "taken" = "place";
    if (taken) status = "taken";
    else if (err > 0.55) status = "angle";
    else if (!fullyInStall(sim.player, stall)) status = "place";
    else if (Math.abs(sim.player.speed) > 0.42) status = "speed";
    else status = "in";
    best = { stall, err, status };
  }
  if (!best || best.status !== "in") {
    sim.parkHold = Math.max(0, sim.parkHold - dt / 0.22);
    sim.settlePlayed = false;
    sim.hint =
      best?.status === "angle"
        ? "Straighten up. Nose in or back in."
        : best?.status === "place"
          ? "All four wheels inside the lines."
          : best?.status === "speed"
            ? "Stop."
            : best?.status === "taken"
              ? "Someone is already in that one."
              : "";
    return;
  }
  sim.lastAlign = best.err;
  sim.hint = "";
  if (!sim.settlePlayed) {
    sim.settlePlayed = true;
    pushSfx(sim, "settle");
  }
  sim.parkHold = Math.min(1, sim.parkHold + dt / 0.62);
  if (sim.parkHold >= 1) win(sim);
}

function updateOffPavement(sim: Sim, dt: number) {
  const p = sim.player;
  const paved = onPavement(p.x, p.y, sim.stalls);
  if (!paved) {
    sim.stress = clamp(sim.stress + 6.5 * dt, 0, 100);
    if (sim.clock - sim.offNotedT > 3.2) {
      sim.offNotedT = sim.clock;
      sim.stress = clamp(sim.stress + 4, 0, 100);
      say(sim, "Grass and shoulders don't count.", "bad");
    }
    if (Math.abs(p.speed) < 0.35) {
      sim.offStop += dt;
      if (sim.offStop > 0.85 && !sim.offStopFired) {
        sim.offStopFired = true;
        sim.stress = clamp(sim.stress + 12, 0, 100);
        sim.sinceHit = 0;
        sim.shake = Math.min(1, sim.shake + 0.3);
        say(sim, "That's not a stall. They will tow the rental.", "bad");
        pushSfx(sim, "horn");
      }
    } else {
      sim.offStop = 0;
      sim.offStopFired = false;
    }
  } else {
    sim.offStop = 0;
    sim.offStopFired = false;
  }
  const inBay = sim.stalls.some((s) => pointInStall(p.x, p.y, s, 0));
  const blocking = paved && !inBay && Math.abs(p.speed) < 0.28 && p.y < 33;
  if (blocking) {
    sim.blockT += dt;
    if (sim.blockT > 2.3 && !sim.blockFired) {
      sim.blockFired = true;
      sim.stress = clamp(sim.stress + 7, 0, 100);
      sim.sinceHit = 0;
      pushSfx(sim, "horn");
      say(sim, p.y > 12 ? "This lane is one car wide." : "You're the jam. Move.", "bad");
    }
  } else {
    sim.blockT = 0;
    sim.blockFired = false;
  }
}

function updateCamera(sim: Sim, dt: number) {
  let tx = -6 + Math.sin(sim.clock * 0.18) * 1.4;
  let ty = 7;
  if (sim.phase !== "menu") {
    const look = sim.phase === "play" ? 1.35 : 0;
    const f = forwardOf(sim.player.yaw);
    tx = sim.player.x + f.x * look;
    ty = sim.player.y + f.y * look;
  }
  const k = 1 - Math.exp(-4.2 * dt);
  sim.camX += (tx - sim.camX) * k;
  sim.camY += (ty - sim.camY) * k;
}

function updateFx(sim: Sim, dt: number) {
  sim.shake = Math.max(0, sim.shake - dt * 1.4);
  sim.messageT = Math.max(0, sim.messageT - dt);
  for (const particle of sim.particles) particle.life -= dt;
  sim.particles = sim.particles.filter((p) => p.life > 0);
  for (const skid of sim.skids) skid.life -= dt;
  sim.skids = sim.skids.filter((s) => s.life > 0);
  for (const c of sim.callouts) c.life -= dt;
  sim.callouts = sim.callouts.filter((c) => c.life > 0);
  for (const id of Object.keys(sim.iframes)) {
    const n = Number(id);
    sim.iframes[n] = (sim.iframes[n] ?? 0) - dt;
  }
}

export function step(sim: Sim, dt: number) {
  sim.clock += dt;
  if (sim.clock - sim.gullClock > 12) {
    sim.gullClock = sim.clock;
    pushSfx(sim, "gull");
  }
  updateCamera(sim, dt);
  if (sim.phase === "menu") return;
  updateFx(sim, dt);
  if (sim.paused || sim.phase !== "play") return;

  sim.time += dt;
  sim.sinceHit += dt;
  const input = readInput(sim);
  integratePlayer(sim, dt, input.steer, input.throttle);
  resolveWalls(sim.player);
  if (sim.player.y < -7.6 && sim.messageT < 0.2) say(sim, "That's the Gulf. The stall is behind you.", "bad");

  const gone: number[] = [];
  for (const car of sim.cars) {
    if (car.honk > 0 && car.role === "parked") car.honk -= dt;
    if (car.role === "parked" || !car.path) continue;
    const speed = car.role === "thief" ? sim.thiefSpeed : 3.35;
    const arrived = follow(car, dt, speed, sim);
    if (!arrived) continue;
    if (car.role === "thief") claimStall(sim, car);
    else gone.push(car.id);
  }
  if (gone.length) sim.cars = sim.cars.filter((c) => !gone.includes(c.id));

  resolveWalls(sim.player);
  hitCars(sim);
  resolveWalls(sim.player);
  updatePeds(sim, dt);
  updateOffPavement(sim, dt);
  updateParking(sim, dt);

  while (sim.eventI < sim.events.length && sim.events[sim.eventI]!.t <= sim.time) {
    if (sim.phase !== "play") break;
    fire(sim, sim.events[sim.eventI]!);
    sim.eventI += 1;
  }

  const left = sim.limit - sim.time;
  if (left < 8 && left > 0) {
    const sec = Math.ceil(left);
    if (sec !== sim.tickSec) {
      sim.tickSec = sec;
      pushSfx(sim, "tick");
    }
  }

  if (sim.sinceHit > 1.15 && onPavement(sim.player.x, sim.player.y, sim.stalls)) {
    sim.stress = Math.max(0, sim.stress - 3.4 * dt);
  }

  if (sim.phase === "play" && sim.time >= sim.limit) lose(sim, "time");
  if (sim.phase === "play" && sim.stress >= 100) lose(sim, "stress");
}

export function openStallCount(sim: Sim) {
  return sim.stalls.filter((s) => !npcInStall(sim, s)).length;
}

export function formatGate(left: number) {
  const s = Math.max(0, Math.ceil(left));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export type HudSnap = {
  phase: Phase;
  paused: boolean;
  round: number;
  name: string;
  blurb: string;
  gate: string;
  hot: boolean;
  stress: number;
  score: number;
  best: number;
  message: string;
  hint: string;
  tone: "info" | "bad";
  park: number;
  open: number;
  resultTitle: string;
  resultBody: string;
  resultGain: number;
  muted: boolean;
};

export function snap(sim: Sim): HudSnap {
  const left = sim.limit - sim.time;
  return {
    phase: sim.phase,
    paused: sim.paused,
    round: sim.round,
    name: sim.name,
    blurb: sim.blurb,
    gate: formatGate(sim.phase === "menu" ? sim.limit : left),
    hot: sim.phase === "play" && left < 10,
    stress: sim.stress,
    score: sim.score,
    best: sim.best,
    message: sim.messageT > 0 ? sim.message : "",
    hint: sim.hint,
    tone: sim.tone,
    park: sim.parkHold,
    open: openStallCount(sim),
    resultTitle: sim.resultTitle,
    resultBody: sim.resultBody,
    resultGain: sim.resultGain,
    muted: sim.muted,
  };
}
