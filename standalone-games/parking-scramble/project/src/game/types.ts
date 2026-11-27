export type LakeId = "louise" | "moraine";

export type Phase = "title" | "drive" | "won" | "lost";

export type Facing = "ns" | "ew";

export type StallKind = "open" | "taken" | "accessible" | "decoy";

export type Stall = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  facing: Facing;
  kind: StallKind;
  row: "west" | "east" | "north";
  claim: "none" | "player" | "ai" | "static";
};

export type Hunter = {
  x: number;
  y: number;
  yaw: number;
  speed: number;
  stallId: string | null;
  phase: "seek" | "enter" | "parked" | "reverse";
  stuck: number;
  hesitate: number;
  reverseFor: number;
  progress: number;
  seenDist: number;
  hue: number;
};

export type TrafficKind = "rv" | "bus" | "sedan" | "shuttle";

export type Traffic = {
  id: string;
  kind: TrafficKind;
  y: number;
  offset: number;
  speed: number;
  yaw: number;
  x: number;
  r: number;
};

export type BodyKind = "elk" | "sheep" | "bear" | "rock" | "photographer" | "pass" | "coffee" | "chair";

export type Body = {
  id: string;
  kind: BodyKind;
  x: number;
  y: number;
  r: number;
  taken: boolean;
  vx: number;
  vy: number;
};

export type Tree = { x: number; y: number; s: number; snow: boolean };

export type Rect = { x: number; y: number; w: number; h: number };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "dust" | "spark" | "glow";
};

export type Popup = { x: number; y: number; text: string; life: number; max: number };

export type Breakdown = {
  arrival: number;
  clean: number;
  pass: number;
  contact: number;
  lake: number;
  side: number;
  last: number;
  dings: number;
  coffee: boolean;
  total: number;
};

export type Beat = { y: number; text: string; fired: boolean };

export type Sim = {
  lake: LakeId;
  phase: Phase;
  paused: boolean;
  player: { x: number; y: number; yaw: number; speed: number };
  hunters: Hunter[];
  traffic: Traffic[];
  bodies: Body[];
  stalls: Stall[];
  trees: Tree[];
  roadLength: number;
  roadWidth: number;
  clock: number;
  gate: number;
  strikes: number;
  invuln: number;
  hasPass: boolean;
  hasCoffee: boolean;
  boothY: number;
  boothPassed: boolean;
  parkHold: number;
  illegalHold: number;
  waterHold: number;
  hint: string;
  message: string;
  messageT: number;
  beats: Beat[];
  score: number;
  breakdown: Breakdown | null;
  failTitle: string;
  failDetail: string;
  lastHit: string;
  trauma: number;
  hitstop: number;
  flash: number;
  particles: Particle[];
  popups: Popup[];
  events: string[];
  time: number;
  fillTimer: number;
  fillEvery: number;
  lot: Rect;
  water: Rect;
  fire: Rect;
  bus: Rect;
  ax: number;
  ay: number;
  lakeside: boolean;
  lastStall: boolean;
  clean: number;
  grace: boolean;
  honkCd: number;
  brakeLight: number;
  camX: number;
  camY: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
};

export type Actions = { steer: number; throttle: number; brake: number; honk: boolean };
