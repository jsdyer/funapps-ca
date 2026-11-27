import { hash } from "./math";
import type { Beat, Body, Hunter, LakeId, Stall, Traffic, Tree } from "./types";

export function roadCenterX(y: number, lake: LakeId) {
  const amp = lake === "moraine" ? 11 : 7.5;
  return Math.sin(y * 0.021) * amp + Math.sin(y * 0.007 + 0.8) * amp * 1.15;
}

export function roadHalf(y: number, roadLength: number, roadWidth: number) {
  const base = roadWidth / 2;
  const flareStart = roadLength - 16;
  if (y <= flareStart) return base;
  const u = Math.min(1, (y - flareStart) / 16);
  return base + (9.2 - base) * u;
}

type StallSpec = { kind: Stall["kind"] };

const LOUISE_WEST: StallSpec[] = [
  { kind: "decoy" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
];
const LOUISE_EAST: StallSpec[] = [
  { kind: "taken" },
  { kind: "accessible" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
];
const LOUISE_NORTH: StallSpec[] = [
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "taken" },
];

const MORAINE_WEST: StallSpec[] = [
  { kind: "decoy" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "taken" },
  { kind: "taken" },
];
const MORAINE_EAST: StallSpec[] = [
  { kind: "taken" },
  { kind: "accessible" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "taken" },
];
const MORAINE_NORTH: StallSpec[] = [
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
  { kind: "taken" },
  { kind: "open" },
  { kind: "taken" },
];

function column(
  specs: StallSpec[],
  row: Stall["row"],
  ax: number,
  ay: number,
  side: -1 | 1,
): Stall[] {
  const pitch = 3.2;
  return specs.map((spec, i) => {
    const y = ay + 14 + i * pitch;
    const x = ax + side * (24 - 2.85);
    return {
      id: `${row}-${i}`,
      x,
      y,
      w: 5.5,
      h: 2.85,
      facing: "ew" as const,
      kind: spec.kind,
      row,
      claim: spec.kind === "taken" ? "static" : "none",
    };
  });
}

function northRow(specs: StallSpec[], ax: number, ay: number): Stall[] {
  return specs.map((spec, i) => ({
    id: `north-${i}`,
    x: ax - 15 + i * 6,
    y: ay + 60 - 2.95,
    w: 2.85,
    h: 5.6,
    facing: "ns" as const,
    kind: spec.kind,
    row: "north" as const,
    claim: spec.kind === "taken" ? ("static" as const) : ("none" as const),
  }));
}

export function buildLevel(lake: LakeId) {
  const roadLength = lake === "louise" ? 300 : 360;
  const roadWidth = lake === "louise" ? 8.8 : 6.4;
  const ax = roadCenterX(roadLength, lake);
  const ay = roadLength;

  const west = column(lake === "louise" ? LOUISE_WEST : MORAINE_WEST, "west", ax, ay, -1);
  const east = column(lake === "louise" ? LOUISE_EAST : MORAINE_EAST, "east", ax, ay, 1);
  const north = northRow(lake === "louise" ? LOUISE_NORTH : MORAINE_NORTH, ax, ay);
  const stalls = [...west, ...east, ...north];

  const lot = { x: ax - 24, y: ay - 2, w: 48, h: 62 };
  const fire = { x: ax - 24, y: ay + 60, w: 48, h: 6.5 };
  const water = { x: ax - 46, y: ay + 66.5, w: 92, h: 42 };
  const bus = { x: ax - 22, y: ay + 1, w: 12, h: 9 };

  const bodies: Body[] = [];
  const add = (kind: Body["kind"], y: number, lat: number, r: number, id: string) => {
    bodies.push({
      id,
      kind,
      x: roadCenterX(y, lake) + lat,
      y,
      r,
      taken: false,
      vx: 0,
      vy: kind === "elk" || kind === "sheep" ? 0.35 : 0,
    });
  };

  if (lake === "louise") {
    add("elk", 52, -1.1, 1.25, "elk1");
    add("photographer", 96, 2.5, 0.7, "photo1");
    add("sheep", 132, 0.2, 0.85, "sheep1");
    add("coffee", 158, 2.7, 0.7, "coffee");
    add("chair", 188, -2.4, 0.7, "chair");
    add("pass", 214, 0.15, 0.75, "pass");
    add("elk", 268, 1.3, 1.25, "elk2");
    add("rock", 242, -2.2, 0.85, "rock1");
  } else {
    add("sheep", 46, 1.1, 0.8, "sheep1");
    add("elk", 78, -0.6, 1.3, "elk1");
    add("bear", 118, 0.4, 1.45, "bear");
    add("coffee", 150, 2.1, 0.7, "coffee");
    add("rock", 176, -0.3, 0.95, "rock1");
    add("photographer", 206, 2.45, 0.7, "photo1");
    add("pass", 236, -0.2, 0.75, "pass");
    add("sheep", 268, 0.8, 0.8, "sheep2");
    add("elk", 310, -1.0, 1.3, "elk2");
    add("chair", 292, 1.8, 0.65, "chair");
  }

  const traffic: Traffic[] = [];
  const pushT = (
    id: string,
    kind: Traffic["kind"],
    y: number,
    offset: number,
    speed: number,
    r: number,
  ) => {
    traffic.push({
      id,
      kind,
      y,
      offset,
      speed,
      yaw: speed >= 0 ? 0 : Math.PI,
      x: roadCenterX(y, lake) + offset,
      r,
    });
  };

  if (lake === "louise") {
    pushT("rv1", "rv", 74, 1.7, 3.1, 2.5);
    pushT("sedan1", "sedan", 124, 1.5, 5.4, 1.35);
    pushT("bus1", "bus", 186, 1.9, 3.6, 2.2);
    pushT("shut1", "shuttle", 230, -2.15, -7.2, 1.7);
    pushT("sedan2", "sedan", 258, 1.4, 4.8, 1.35);
  } else {
    pushT("rv1", "rv", 64, 1.15, 2.8, 2.4);
    pushT("shut1", "shuttle", 104, -1.55, -6.4, 1.6);
    pushT("sedan1", "sedan", 148, 1.05, 4.6, 1.3);
    pushT("bus1", "bus", 198, 1.2, 3.2, 2.05);
    pushT("shut2", "shuttle", 252, -1.45, -6.8, 1.6);
    pushT("sedan2", "sedan", 300, 1.0, 4.2, 1.3);
  }

  const trees: Tree[] = [];
  for (let y = 6; y < roadLength - 8; y += 9) {
    for (const side of [-1, 1] as const) {
      const j = hash(y * 2.1 + side * 9);
      const half = roadWidth / 2;
      const x = roadCenterX(y, lake) + side * (half + 2.6 + j * 4.8);
      trees.push({
        x,
        y: y + j * 7,
        s: 0.75 + hash(y + side * 4) * 0.85,
        snow: hash(y * 5 + side) > 0.72,
      });
      const j2 = hash(y * 4.4 + side);
      trees.push({
        x: roadCenterX(y + 4, lake) + side * (half + 6 + j2 * 7),
        y: y + 3 + j2 * 5,
        s: 0.6 + j2 * 0.7,
        snow: j2 > 0.8,
      });
    }
  }

  const hunters: Hunter[] = [];
  const spots = lake === "louise" ? 2 : 3;
  const starts = [
    { x: ax - 4, y: ay + 10, yaw: 0.4 },
    { x: ax + 5, y: ay + 24, yaw: Math.PI * 0.9 },
    { x: ax - 1, y: ay + 38, yaw: Math.PI },
  ];
  for (let i = 0; i < spots; i++) {
    const s = starts[i]!;
    hunters.push({
      x: s.x,
      y: s.y,
      yaw: s.yaw,
      speed: 2.2,
      stallId: null,
      phase: "seek",
      stuck: 0,
      hesitate: 0,
      reverseFor: 0,
      progress: 0,
      seenDist: 99,
      hue: i,
    });
  }

  const beats: Beat[] = (
    lake === "louise"
      ? [
          [18, "4:48 a.m. The thermos is still too hot. The lot is not waiting."],
          [58, "Elk like the warm asphalt. They are not on your schedule."],
          [100, "Someone stopped for a photo. Of the dark."],
          [150, "Coffee on the shoulder. Questionable. Correct."],
          [200, "A shuttle is coming down. This road was not built for courage."],
          [250, "Kiosk soon. No park pass, no turquoise. It is a simple religion."],
        ]
      : [
          [18, "Moraine Lake Road. Narrow, dark, and worth it if you stop inside the lines."],
          [70, "The elk have seniority. You have a rental agreement."],
          [120, "Bear country. The bear did not set an alarm."],
          [180, "Rock on the line. The mountain is shedding."],
          [230, "Pass on the road. Do not be a story the kiosk tells later."],
          [300, "The rockpile is close. So is everybody else who left at 3:40."],
        ]
  ).map(([y, text]) => ({ y: y as number, text: text as string, fired: false }));

  return {
    roadLength,
    roadWidth,
    ax,
    ay,
    stalls,
    lot,
    fire,
    water,
    bus,
    bodies,
    traffic,
    trees,
    hunters,
    beats,
    gate: lake === "louise" ? 78 : 86,
    fillEvery: lake === "louise" ? 13 : 10,
    boothY: roadLength - 24,
  };
}
