export const WORLD_W = 4000;
export const WORLD_H = 3000;

export const SPAWN = { x: 1120, y: 1520 };
export const DOCK = { x: 860, y: 1610, r: 124 };
export const WHARF = { x: 800, y: 1810 };

export type Pt = readonly [number, number];

export const SOUTH: Pt[] = [
  [0, 3000],
  [0, 2140],
  [280, 2060],
  [620, 1960],
  [980, 1985],
  [1400, 2100],
  [2000, 2220],
  [2700, 2340],
  [3400, 2440],
  [4000, 2500],
  [4000, 3000],
];

export const POINT: Pt[] = [
  [0, 780],
  [0, 1680],
  [260, 1620],
  [520, 1460],
  [700, 1260],
  [640, 1080],
  [380, 920],
  [120, 800],
];

export const ISLAND: Pt[] = ellipse(2860, 820, 430, 280, 16);

export type Rock = { x: number; y: number; r: number; scale: number };
export type Patch = { x: number; y: number; r: number; rot: number };
export type Stamp = { x: number; y: number; scale: number; rot: number };

export const ROCKS: Rock[] = [
  { x: 1040, y: 1140, r: 42, scale: 0.95 },
  { x: 1540, y: 880, r: 50, scale: 1.15 },
  { x: 1900, y: 1260, r: 36, scale: 0.8 },
  { x: 2380, y: 840, r: 44, scale: 1 },
  { x: 2720, y: 1120, r: 38, scale: 0.86 },
  { x: 3340, y: 1360, r: 48, scale: 1.1 },
  { x: 1360, y: 1560, r: 32, scale: 0.72 },
];

export const KELP: Patch[] = [
  { x: 1300, y: 1480, r: 74, rot: 0.2 },
  { x: 1780, y: 1340, r: 86, rot: -0.4 },
  { x: 2460, y: 1460, r: 70, rot: 0.6 },
  { x: 3080, y: 1520, r: 64, rot: 1.1 },
];

export const TREES: Stamp[] = [
  { x: 180, y: 2320, scale: 1, rot: 0.1 },
  { x: 460, y: 2200, scale: 0.85, rot: -0.2 },
  { x: 860, y: 2160, scale: 1.05, rot: 0.4 },
  { x: 1280, y: 2300, scale: 0.9, rot: 0 },
  { x: 1680, y: 2400, scale: 1.1, rot: 0.3 },
  { x: 2140, y: 2500, scale: 0.95, rot: -0.2 },
  { x: 2680, y: 2580, scale: 1, rot: 0.2 },
  { x: 3280, y: 2680, scale: 0.88, rot: 0.5 },
  { x: 200, y: 1120, scale: 0.8, rot: 0.2 },
  { x: 340, y: 1420, scale: 0.95, rot: -0.3 },
  { x: 180, y: 1560, scale: 0.75, rot: 0.6 },
  { x: 2620, y: 760, scale: 0.85, rot: 0.2 },
  { x: 2920, y: 900, scale: 0.95, rot: -0.4 },
  { x: 3080, y: 740, scale: 0.7, rot: 0.8 },
  { x: 2740, y: 960, scale: 0.8, rot: 0.1 },
];

export type BuoySeed = { x: number; y: number; mine: boolean };

export const BUOYS: BuoySeed[] = [
  { x: 1280, y: 1320, mine: true },
  { x: 1540, y: 1140, mine: true },
  { x: 1820, y: 1020, mine: true },
  { x: 2100, y: 960, mine: true },
  { x: 2380, y: 1080, mine: true },
  { x: 2620, y: 1260, mine: true },
  { x: 2920, y: 1380, mine: true },
  { x: 3220, y: 1180, mine: true },
  { x: 1360, y: 980, mine: false },
  { x: 2140, y: 1320, mine: false },
  { x: 3380, y: 1040, mine: false },
];

export const RIVAL_PATH: Pt[] = [
  [1460, 700],
  [2060, 600],
  [2680, 520],
  [3400, 680],
  [3180, 1540],
  [2200, 1620],
  [1500, 1420],
];

export const GULLS = [
  { cx: 1500, cy: 1100, rx: 220, ry: 90, speed: 0.35, phase: 0.4 },
  { cx: 2300, cy: 900, rx: 280, ry: 110, speed: 0.28, phase: 2.1 },
  { cx: 3000, cy: 1200, rx: 200, ry: 80, speed: 0.4, phase: 4.2 },
];

export const LABELS: { text: string; x: number; y: number }[] = [
  { text: "Government Wharf", x: 800, y: 1920 },
  { text: "Sandy Point", x: 340, y: 1280 },
  { text: "McNutt's Island", x: 2860, y: 980 },
  { text: "Cape Roseway", x: 3180, y: 620 },
];

export function ellipse(cx: number, cy: number, rx: number, ry: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function pointInPoly(x: number, y: number, poly: readonly Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 0.00001) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function onLand(x: number, y: number): boolean {
  return pointInPoly(x, y, SOUTH) || pointInPoly(x, y, POINT) || pointInPoly(x, y, ISLAND);
}

export function yawToward(fromX: number, fromY: number, toX: number, toY: number): number {
  return Math.atan2(-(toX - fromX), -(toY - fromY));
}

export function heading(yaw: number): { x: number; y: number } {
  return { x: -Math.sin(yaw), y: -Math.cos(yaw) };
}
