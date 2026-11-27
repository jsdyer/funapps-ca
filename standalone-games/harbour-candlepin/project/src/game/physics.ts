/** Lane physics in inches. Deterministic: same aim, same leave. */

export const HEAD_Z = 720;
export const ARROW_Z = 180;
export const BALL_Z = -8;
export const LANE_HALF = 21;
export const BALL_R = 2.25;
export const PIN_R = 1.48;
export const DOWN_R = 5.15;
export const PIN_SPACING = 12;

const BALL_MASS = 1.15;
const PIN_MASS = 0.58;
const SPIN_ACCEL = 7.5;
const TIP_IMPACT = 48;
const WOBBLE_IMPACT = 18;
const SWEEP_REACH = 14.8;
const SWEEP_LATERAL = 8.4;
const SWEEP_MIN = 70;

export type PinState = "up" | "wobble" | "fly" | "down" | "out";

export type Pin = {
  id: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  state: PinState;
  wobble: number;
  tilt: number;
  heading: number;
  flyT: number;
};

export type Ball = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  spin: number;
  spinVisual: number;
  active: boolean;
  gutter: boolean;
  hidden: boolean;
};

export type Particle = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  life: number;
  max: number;
  kind: "dust" | "chip";
};

export type SimEvent =
  | { kind: "clack"; power: number }
  | { kind: "gutter" }
  | { kind: "multi"; count: number };

export type World = {
  pins: Pin[];
  ball: Ball | null;
  particles: Particle[];
  phase: "idle" | "roll" | "settle" | "done";
  settleT: number;
  freeze: number;
  trauma: number;
  events: SimEvent[];
  ballTouched: number[];
  woodTipped: number[];
  allowFalls: boolean;
  tipsThisStep: number;
};

const ROW = PIN_SPACING * Math.sin(Math.PI / 3);

const SPOTS: [number, number][] = [
  [0, 0],
  [-PIN_SPACING / 2, ROW],
  [PIN_SPACING / 2, ROW],
  [-PIN_SPACING, ROW * 2],
  [0, ROW * 2],
  [PIN_SPACING, ROW * 2],
  [-PIN_SPACING * 1.5, ROW * 3],
  [-PIN_SPACING * 0.5, ROW * 3],
  [PIN_SPACING * 0.5, ROW * 3],
  [PIN_SPACING * 1.5, ROW * 3],
];

/** Ten candlepins, 4-3-2-1, head pin nearest the bowler. */
export const PIN_LAYOUT: { id: number; x: number; z: number }[] = SPOTS.map(([x, z], index) => ({
  id: index + 1,
  x,
  z: HEAD_Z + z,
}));

export function freshPins(): Pin[] {
  return PIN_LAYOUT.map((spot) => ({
    id: spot.id,
    x: spot.x,
    z: spot.z,
    vx: 0,
    vz: 0,
    state: "up",
    wobble: 0,
    tilt: 0,
    heading: 0,
    flyT: 0,
  }));
}

export function createWorld(pins = freshPins()): World {
  return {
    pins,
    ball: null,
    particles: [],
    phase: "idle",
    settleT: 0,
    freeze: 0,
    trauma: 0,
    events: [],
    ballTouched: [],
    woodTipped: [],
    allowFalls: false,
    tipsThisStep: 0,
  };
}

export function countStanding(world: World): number {
  return world.pins.reduce((sum, pin) => {
    if (pin.state === "up" || pin.state === "wobble") return sum + 1;
    return sum;
  }, 0);
}

export function launchSpeed(power: number): number {
  const clamped = Math.max(0, Math.min(1, power));
  return 145 + clamped * 240;
}

export function predictPath(
  stance: number,
  target: number,
  power: number,
  spin: number,
): { x: number; z: number }[] {
  const speed = launchSpeed(power);
  const dz = HEAD_Z - BALL_Z;
  const dx = target - stance;
  const len = Math.hypot(dx, dz) || 1;
  let x = stance;
  let z = BALL_Z;
  let vx = (dx / len) * speed;
  let vz = (dz / len) * speed;
  const points: { x: number; z: number }[] = [];
  const dt = 0.04;
  for (let i = 0; i < 90; i++) {
    vx += spin * SPIN_ACCEL * dt;
    x += vx * dt;
    z += vz * dt;
    points.push({ x, z });
    if (z > HEAD_Z + 36 || Math.abs(x) > LANE_HALF + 8) break;
  }
  return points;
}

export function launch(world: World, stance: number, target: number, power: number, spin: number): void {
  const speed = launchSpeed(power);
  const dz = HEAD_Z - BALL_Z;
  const dx = target - stance;
  const len = Math.hypot(dx, dz) || 1;
  world.ball = {
    x: stance,
    z: BALL_Z,
    vx: (dx / len) * speed,
    vz: (dz / len) * speed,
    spin,
    spinVisual: 0,
    active: true,
    gutter: false,
    hidden: false,
  };
  world.phase = "roll";
  world.settleT = 0;
  world.allowFalls = true;
  world.ballTouched = [];
  world.woodTipped = [];
  world.events = [];
  world.tipsThisStep = 0;
}

function radiusOf(pin: Pin): number {
  if (pin.state === "out") return 0;
  if (pin.state === "down" || pin.state === "fly") return DOWN_R;
  return PIN_R;
}

function burst(world: World, x: number, z: number, speed: number): void {
  const count = 4 + Math.min(4, Math.floor(speed / 80));
  for (let i = 0; i < count; i++) {
    if (world.particles.length > 90) world.particles.shift();
    const ang = (i / count) * Math.PI * 2 + speed * 0.01;
    const mag = 20 + (i % 3) * 14;
    world.particles.push({
      x,
      z,
      vx: Math.cos(ang) * mag,
      vz: Math.sin(ang) * mag,
      life: 0.35 + (i % 3) * 0.08,
      max: 0.45,
      kind: i % 2 === 0 ? "dust" : "chip",
    });
  }
}

function tip(
  world: World,
  pin: Pin,
  dirx: number,
  dirz: number,
  speed: number,
  source: "ball" | "wood" | "sweep",
): void {
  if (pin.state === "out") return;
  if (pin.state === "down" || pin.state === "fly") {
    pin.vx += dirx * speed * 0.22;
    pin.vz += dirz * speed * 0.22;
    return;
  }
  if (!world.allowFalls) return;

  if (source === "sweep" && speed < SWEEP_MIN) {
    pin.wobble += speed / 46;
    pin.state = "wobble";
    if (pin.wobble < 1.05) return;
    speed = 76;
  }

  const mag = Math.hypot(dirx, dirz) || 1;
  const nx = dirx / mag;
  const nz = dirz / mag;
  pin.state = "fly";
  pin.flyT = 0;
  pin.tilt = 0;
  pin.wobble = 0;
  pin.heading = Math.atan2(nx, nz);
  const chainPower = Math.max(70, Math.min(320, speed));
  const launchV = Math.max(48, Math.min(130, speed * 0.4));
  pin.vx = nx * launchV;
  pin.vz = nz * launchV;
  world.tipsThisStep += 1;
  if (source === "ball") world.ballTouched.push(pin.id);
  if (source === "wood") world.woodTipped.push(pin.id);
  world.events.push({ kind: "clack", power: Math.min(1, chainPower / 240) });
  world.trauma = Math.min(1, world.trauma + (chainPower > 180 ? 0.22 : 0.12));
  burst(world, pin.x, pin.z, launchV);
  const chain = Math.min(0.84, Math.max(0.3, (chainPower - 90) / 300));
  sweep(world, pin, nx, nz, chainPower * chain);
}

function sweep(world: World, pin: Pin, dirx: number, dirz: number, speed: number): void {
  if (speed < 36) return;
  for (const other of world.pins) {
    if (other.id === pin.id) continue;
    if (other.state === "out" || other.state === "down" || other.state === "fly") continue;
    const ox = other.x - pin.x;
    const oz = other.z - pin.z;
    const along = ox * dirx + oz * dirz;
    if (along < 1.5 || along > SWEEP_REACH) continue;
    const lateral = Math.abs(ox * -dirz + oz * dirx);
    if (lateral > SWEEP_LATERAL) continue;
    const falloff = 1 - along / SWEEP_REACH;
    tip(world, other, dirx, dirz, speed * (0.55 + falloff * 0.5), "sweep");
  }
}

function collideFree(
  a: { x: number; z: number; vx: number; vz: number },
  b: { x: number; z: number; vx: number; vz: number },
  invA: number,
  invB: number,
  rest: number,
  minDist: number,
): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let dist = Math.hypot(dx, dz);
  if (dist < 1e-4) dist = 1e-4;
  if (dist >= minDist) return 0;
  const nx = dx / dist;
  const nz = dz / dist;
  const overlap = minDist - dist;
  const inv = invA + invB || 1;
  a.x -= nx * overlap * (invA / inv);
  a.z -= nz * overlap * (invA / inv);
  b.x += nx * overlap * (invB / inv);
  b.z += nz * overlap * (invB / inv);
  const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rv > 0) return 0;
  const j = (-(1 + rest) * rv) / inv;
  a.vx -= j * nx * invA;
  a.vz -= j * nz * invA;
  b.vx += j * nx * invB;
  b.vz += j * nz * invB;
  return Math.abs(j);
}

function substep(world: World, dt: number): void {
  const ball = world.ball;
  if (ball?.active) {
    ball.vx += ball.spin * SPIN_ACCEL * dt;
    ball.vx *= Math.exp(-0.12 * dt);
    ball.vz *= Math.exp(-0.05 * dt);
    ball.x += ball.vx * dt;
    ball.z += ball.vz * dt;
    ball.spinVisual += dt * (8 + Math.abs(ball.vx) * 0.02);
    if (!ball.gutter && Math.abs(ball.x) > LANE_HALF - 0.4 && ball.z < HEAD_Z + 8) {
      ball.gutter = true;
      world.events.push({ kind: "gutter" });
    }
    if (ball.gutter) {
      const side = ball.x >= 0 ? 1 : -1;
      const track = side * (LANE_HALF + 5.5);
      ball.x += (track - ball.x) * Math.min(1, dt * 8);
      ball.vx = 0;
    }
  }

  for (const pin of world.pins) {
    if (pin.state === "wobble" && world.allowFalls) {
      if (pin.wobble > 0.84) pin.wobble += dt * 0.55;
      else pin.wobble *= Math.exp(-1.35 * dt);
      if (pin.wobble >= 1.05) {
        const dir = pin.heading || 0;
        tip(world, pin, Math.sin(dir) || 0.2, Math.cos(dir) || 0.9, 80, "sweep");
      } else if (pin.wobble < 0.08) {
        pin.state = "up";
        pin.wobble = 0;
      }
    }
    if (pin.state !== "fly" && pin.state !== "down") continue;
    pin.x += pin.vx * dt;
    pin.z += pin.vz * dt;
    const drag = pin.state === "fly" ? 0.4 : 3.1;
    const keep = Math.exp(-drag * dt);
    pin.vx *= keep;
    pin.vz *= keep;
    if (pin.state === "fly") {
      pin.flyT += dt;
      pin.tilt = Math.min(1, pin.flyT / 0.2);
      if (pin.tilt >= 1) pin.state = "down";
    }
    const speed = Math.hypot(pin.vx, pin.vz);
    if (pin.state === "down" && speed < 10) {
      pin.vx = 0;
      pin.vz = 0;
    }
    if (Math.abs(pin.x) > LANE_HALF + 1.2 || pin.z > HEAD_Z + 120 || pin.z < HEAD_Z - 200) {
      pin.state = "out";
      pin.vx = 0;
      pin.vz = 0;
    }
  }

  if (ball?.active && !ball.gutter) {
    for (const pin of world.pins) {
      if (pin.state === "out") continue;
      const minDist = BALL_R + radiusOf(pin);
      const dx = pin.x - ball.x;
      const dz = pin.z - ball.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      if (dist >= minDist) continue;
      const nx = dx / dist;
      const nz = dz / dist;
      if (pin.state === "up" || pin.state === "wobble") {
        const overlap = minDist - dist;
        ball.x -= nx * overlap;
        ball.z -= nz * overlap;
        const impact = Math.max(0, ball.vx * nx + ball.vz * nz);
        const travel = Math.hypot(ball.vx, ball.vz) || 1;
        const dirx = nx * 0.3 + (ball.vx / travel) * 0.25;
        const dirz = 0.15 * nz + Math.abs(ball.vz / travel);
        if (impact > TIP_IMPACT) {
          tip(world, pin, dirx, dirz, impact * 0.95, "ball");
          ball.vx -= nx * impact * 0.34;
          ball.vz -= nz * impact * 0.16;
        } else if (impact > WOBBLE_IMPACT) {
          pin.state = "wobble";
          pin.wobble += impact / 34;
          pin.heading = Math.atan2(dirx, dirz);
          world.ballTouched.push(pin.id);
          world.events.push({ kind: "clack", power: 0.25 });
          ball.vx -= nx * impact * 0.2;
          ball.vz -= nz * impact * 0.08;
        } else {
          ball.vx -= nx * impact * 0.12;
        }
        if (ball.vz < 40) ball.vz = 40;
      } else {
        const ghost = { x: pin.x, z: pin.z, vx: pin.vx, vz: pin.vz };
        const ballBody = { x: ball.x, z: ball.z, vx: ball.vx, vz: ball.vz };
        const impulse = collideFree(ballBody, ghost, 1 / BALL_MASS, 1 / PIN_MASS, 0.35, minDist);
        ball.x = ballBody.x;
        ball.z = ballBody.z;
        ball.vx = ballBody.vx;
        ball.vz = Math.max(30, ballBody.vz);
        pin.x = ghost.x;
        pin.z = ghost.z;
        pin.vx = ghost.vx;
        pin.vz = ghost.vz;
        if (impulse > 8) world.events.push({ kind: "clack", power: Math.min(1, impulse / 80) });
      }
    }
  }

  for (let i = 0; i < world.pins.length; i++) {
    const a = world.pins[i];
    if (!a || a.state === "out" || a.state === "up" || a.state === "wobble") continue;
    for (let j = 0; j < world.pins.length; j++) {
      if (i === j) continue;
      const b = world.pins[j];
      if (!b || b.state === "out") continue;
      if (b.state === "up" || b.state === "wobble") {
        const minDist = radiusOf(a) + PIN_R;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz) || 0.0001;
        if (dist >= minDist) continue;
        const nx = dx / dist;
        const nz = dz / dist;
        const rel = a.vx * nx + a.vz * nz;
        if (rel <= 0 && Math.hypot(a.vx, a.vz) < 20) continue;
        const impact = Math.max(0, rel);
        a.x -= nx * (minDist - dist);
        a.z -= nz * (minDist - dist);
        a.vx -= nx * impact * 0.45;
        a.vz -= nz * impact * 0.45;
        if (impact > 22) tip(world, b, nx, nz, impact * 0.85 + 20, "wood");
      } else if (j > i) {
        const minDist = radiusOf(a) + radiusOf(b);
        collideFree(a, b, 1 / PIN_MASS, 1 / PIN_MASS, 0.28, minDist);
      }
    }
  }

  for (const pin of world.pins) {
    const sp = Math.hypot(pin.vx, pin.vz);
    if (sp > 420) {
      pin.vx *= 420 / sp;
      pin.vz *= 420 / sp;
    }
  }
}

function finishIfReady(world: World, dt: number): void {
  const ball = world.ball;
  if (world.phase === "roll" && ball) {
    const past = ball.z > HEAD_Z + 48;
    const gutterDone = ball.gutter && ball.z > HEAD_Z - 10;
    const trickled = ball.z > 80 && Math.hypot(ball.vx, ball.vz) < 28;
    if (past || gutterDone || trickled) {
      ball.active = false;
      ball.hidden = true;
      world.phase = "settle";
      world.settleT = 0;
    }
  }

  if (world.phase !== "settle") return;
  world.settleT += dt;
  const busy = world.pins.some((pin) => {
    if (pin.state === "fly") return true;
    if (pin.state === "down" && Math.hypot(pin.vx, pin.vz) > 12) return true;
    if (pin.state === "wobble" && pin.wobble > 0.2) return true;
    return false;
  });
  const timedOut = world.settleT > 2.05;
  if ((busy && !timedOut) || world.settleT < 0.18) return;

  for (const pin of world.pins) {
    if (pin.state === "fly") {
      pin.state = "down";
      pin.tilt = 1;
      pin.vx = 0;
      pin.vz = 0;
    } else if (pin.state === "wobble") {
      if (pin.wobble > 0.84) {
        pin.state = "down";
        pin.tilt = 1;
        pin.vx = 0;
        pin.vz = 0;
      } else {
        pin.state = "up";
        pin.wobble = 0;
      }
    } else if (pin.state === "down") {
      pin.vx = 0;
      pin.vz = 0;
      pin.tilt = 1;
    }
  }
  world.allowFalls = false;
  world.phase = "done";
  if (world.tipsThisStep >= 4) world.trauma = Math.min(1, world.trauma + 0.28);
}

export function step(world: World, dt: number): void {
  if (world.freeze > 0) {
    world.freeze = Math.max(0, world.freeze - dt);
    return;
  }
  world.tipsThisStep = 0;

  for (let i = world.particles.length - 1; i >= 0; i--) {
    const particle = world.particles[i];
    if (!particle) continue;
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.z += particle.vz * dt;
    particle.vx *= Math.exp(-2 * dt);
    particle.vz *= Math.exp(-2 * dt);
    if (particle.life <= 0) world.particles.splice(i, 1);
  }

  if (world.phase === "idle" || world.phase === "done") return;

  const ball = world.ball;
  const speed = ball?.active ? Math.hypot(ball.vx, ball.vz) : 0;
  const slices = Math.max(1, Math.ceil((speed * dt) / 1.35));
  const h = dt / slices;
  for (let i = 0; i < slices; i++) substep(world, h);
  finishIfReady(world, dt);

  if (world.tipsThisStep >= 4) {
    world.freeze = 0.045;
    world.events.push({ kind: "multi", count: world.tipsThisStep });
    world.trauma = Math.min(1, world.trauma + 0.18);
  }
}
