export const FINISH = 480;
export const TIME_LIMIT = 72;

export type Kind =
  | "rock"
  | "log"
  | "branch"
  | "moose"
  | "gap"
  | "berry"
  | "token"
  | "postcard";

export interface Ent {
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  label?: string;
}

export interface Deco {
  x: number;
  w: number;
  kind: "pool" | "tuft" | "stone";
}

const BOX: Record<Kind, { w: number; h: number; y: number }> = {
  rock: { w: 0.86, h: 0.6, y: 0 },
  log: { w: 1.5, h: 0.5, y: 0 },
  branch: { w: 1.9, h: 0.5, y: 1.32 },
  moose: { w: 1.35, h: 0.5, y: 0 },
  gap: { w: 1.25, h: 0.4, y: 0 },
  berry: { w: 0.5, h: 0.5, y: 0.78 },
  token: { w: 0.48, h: 0.52, y: 1.12 },
  postcard: { w: 0.52, h: 0.68, y: 1.05 },
};

const SCRIPT: Kind[] = [
  "rock",
  "berry",
  "berry",
  "berry",
  "log",
  "berry",
  "berry",
  "branch",
  "postcard",
  "gap",
  "berry",
  "berry",
  "token",
  "rock",
  "branch",
  "log",
  "moose",
  "berry",
  "berry",
  "berry",
  "token",
  "gap",
  "branch",
  "rock",
  "postcard",
  "log",
  "branch",
  "token",
  "moose",
  "rock",
  "berry",
  "berry",
  "branch",
  "log",
  "gap",
  "postcard",
  "token",
  "branch",
  "rock",
  "log",
  "moose",
  "branch",
  "berry",
  "berry",
  "berry",
  "token",
  "rock",
  "branch",
  "log",
];

const POSTCARDS = ["The Lookout", "Tablelands", "Snug Harbour"];

export function speedAt(x: number) {
  return 6.9 + 2.3 * Math.min(1, Math.max(0, x) / FINISH);
}

function minGap(x: number) {
  return Math.max(8.2, speedAt(x) * 0.98);
}

function low(kind: Kind) {
  return kind === "rock" || kind === "log" || kind === "gap" || kind === "moose";
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCourse(seed: number): { ents: Ent[]; decos: Deco[] } {
  const rng = mulberry32(seed || 1);
  const ents: Ent[] = [];
  let x = 22;
  let prev: Kind | null = null;
  let post = 0;
  let i = 0;

  while (x < FINISH - 22 && i < 240) {
    let kind = SCRIPT[i % SCRIPT.length];
    i += 1;
    if (kind === "rock" || kind === "log") {
      kind = rng() < 0.5 ? "rock" : "log";
    }
    if (kind === "gap" && x > 175 && x < 330) kind = "log";
    if (kind === "postcard") {
      if (post >= POSTCARDS.length) kind = "token";
    }

    let gap = minGap(x);
    if (kind === "berry") gap = prev === "berry" ? 1.35 : 2.15;
    else if (kind === "token" && prev === "berry") gap = 2.4;
    if (prev && low(prev) && kind === "branch") gap += 2.4;
    if (prev === "branch" && low(kind)) gap += 3.1;
    if (kind === "moose") gap += 3.4;
    if (kind === "gap") gap += 1.2;

    x += gap;
    if (x > FINISH - 22) break;
    const box = BOX[kind];
    const ent: Ent = {
      kind,
      x,
      y: box.y,
      w: box.w,
      h: box.h,
      alive: true,
    };
    if (kind === "postcard") {
      ent.label = POSTCARDS[post];
      post += 1;
    }
    ents.push(ent);
    x += box.w;
    prev = kind;
  }

  const decos: Deco[] = [];
  for (let d = 4; d < FINISH; d += 2.4) {
    const r = rng();
    if (d < 180 && r < 0.55) decos.push({ x: d, w: 0.8 + rng() * 1.4, kind: "pool" });
    else if (r < 0.8) decos.push({ x: d, w: 0.35 + rng() * 0.5, kind: "tuft" });
    else decos.push({ x: d, w: 0.25 + rng() * 0.35, kind: "stone" });
  }

  return { ents, decos };
}
