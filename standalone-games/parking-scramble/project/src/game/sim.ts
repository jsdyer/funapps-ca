import { buildLevel, roadCenterX, roadHalf } from "./level";
import { clamp, forward, wrap } from "./math";
import type { Actions, Body, Hunter, LakeId, Sim, Stall, Traffic } from "./types";

const CAR_L = 4.35;
const CAR_W = 1.82;

export function createSim(lake: LakeId): Sim {
  const level = buildLevel(lake);
  const y0 = 14;
  const sim: Sim = {
    lake,
    phase: "drive",
    paused: false,
    player: {
      x: roadCenterX(y0, lake) + (lake === "louise" ? 1.55 : 1.15),
      y: y0,
      yaw: 0,
      speed: 0,
    },
    hunters: level.hunters,
    traffic: level.traffic,
    bodies: level.bodies,
    stalls: level.stalls,
    trees: level.trees,
    roadLength: level.roadLength,
    roadWidth: level.roadWidth,
    clock: 0,
    gate: level.gate,
    strikes: 0,
    invuln: 0,
    hasPass: false,
    hasCoffee: false,
    boothY: level.boothY,
    boothPassed: false,
    parkHold: 0,
    illegalHold: 0,
    waterHold: 0,
    hint: "Grab the park pass. Stop inside an empty stall.",
    message: level.beats[0]?.text ?? "",
    messageT: 4.5,
    beats: level.beats,
    score: 0,
    breakdown: null,
    failTitle: "",
    failDetail: "",
    lastHit: "",
    trauma: 0,
    hitstop: 0,
    flash: 0,
    particles: [],
    popups: [],
    events: [],
    time: 0,
    fillTimer: 0,
    fillEvery: level.fillEvery,
    lot: level.lot,
    water: level.water,
    fire: level.fire,
    bus: level.bus,
    ax: level.ax,
    ay: level.ay,
    lakeside: false,
    lastStall: false,
    clean: 0,
    grace: false,
    honkCd: 0,
    brakeLight: 0,
    camX: roadCenterX(y0, lake) + 1.5,
    camY: y0 + 8,
    zoom: 18,
    shakeX: 0,
    shakeY: 0,
  };
  if (sim.beats[0]) sim.beats[0].fired = true;
  return sim;
}

function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }, pad = 0) {
  return x >= r.x - pad && y >= r.y - pad && x <= r.x + r.w + pad && y <= r.y + r.h + pad;
}

function stallHas(s: Stall, x: number, y: number) {
  return Math.abs(x - s.x) <= s.w / 2 && Math.abs(y - s.y) <= s.h / 2;
}

function corners(x: number, y: number, yaw: number) {
  const f = forward(yaw);
  const rx = f.y;
  const ry = -f.x;
  const hl = CAR_L / 2;
  const hw = CAR_W / 2;
  const pts: { x: number; y: number }[] = [];
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      pts.push({ x: x + f.x * hl * s + rx * hw * t, y: y + f.y * hl * s + ry * hw * t });
    }
  }
  return pts;
}

function aligned(yaw: number, facing: Stall["facing"]) {
  const s = Math.abs(Math.sin(yaw));
  if (facing === "ns") return s < 0.34;
  return s > 0.9;
}

function popup(sim: Sim, x: number, y: number, text: string) {
  sim.popups.push({ x, y, text, life: 1.3, max: 1.3 });
}

function burst(sim: Sim, x: number, y: number, n: number, kind: "dust" | "spark" | "glow") {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 4;
    sim.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      kind,
    });
  }
  if (sim.particles.length > 90) sim.particles.splice(0, sim.particles.length - 90);
}

function say(sim: Sim, text: string, hold = 3.4) {
  sim.message = text;
  sim.messageT = hold;
}

function guide(sim: Sim, text: string) {
  sim.hint = text;
  if (sim.message === text && sim.messageT > 0.35) return;
  say(sim, text, 1.5);
}

function strike(sim: Sim, why: string, x: number, y: number) {
  if (sim.invuln > 0 || sim.phase !== "drive") return;
  sim.strikes += 1;
  sim.invuln = 0.85;
  sim.hitstop = 0.06;
  sim.flash = 0.12;
  sim.trauma = Math.min(1, sim.trauma + 0.55);
  sim.lastHit = why;
  sim.events.push("hit");
  burst(sim, x, y, 10, "spark");
  popup(sim, x, y + 1.5, why);
  if (sim.strikes >= 3) {
    const elk = why === "ELK" || sim.lastHit === "ELK";
    lose(
      sim,
      elk ? "The elk had the road" : "The rental is done",
      elk
        ? "Three meetings with things bigger than a Subaru. The elk kept the asphalt. You kept the ditch."
        : "Three hits. The lot is still up there, and the headlights are not. Sunrise, from the shoulder.",
    );
  }
}

function lose(sim: Sim, title: string, detail: string) {
  if (sim.phase !== "drive") return;
  sim.phase = "lost";
  sim.failTitle = title;
  sim.failDetail = detail;
  sim.paused = false;
  sim.events.push("fail");
}

function approachPoint(s: Stall) {
  if (s.row === "west") return { x: s.x + s.w / 2 + 2.4, y: s.y };
  if (s.row === "east") return { x: s.x - s.w / 2 - 2.4, y: s.y };
  return { x: s.x, y: s.y - s.h / 2 - 2.5 };
}

function parkYaw(s: Stall) {
  if (s.row === "west") return -Math.PI / 2;
  if (s.row === "east") return Math.PI / 2;
  return Math.PI;
}

function openLegal(sim: Sim) {
  return sim.stalls.filter((s) => s.kind === "open" && s.claim === "none");
}

function pickStall(sim: Sim, h: Hunter) {
  let best: Stall | null = null;
  let bestD = 1e9;
  for (const s of sim.stalls) {
    if (s.kind !== "open" || s.claim !== "none") continue;
    if (sim.hunters.some((o) => o !== h && o.stallId === s.id && o.phase !== "reverse")) continue;
    const d = Math.hypot(s.x - h.x, s.y - h.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function playerInStall(sim: Sim, s: Stall) {
  return stallHas(s, sim.player.x, sim.player.y);
}

function stepHunter(sim: Sim, h: Hunter, dt: number) {
  if (h.phase === "parked") {
    h.speed = 0;
    return;
  }
  if (sim.player.y < sim.roadLength - 88) {
    h.speed = 0;
    h.hesitate = 0;
    return;
  }
  if (h.hesitate > 0) {
    h.hesitate -= dt;
    h.speed *= 0.8;
  }
  if (h.reverseFor > 0) {
    h.reverseFor -= dt;
    const f = forward(h.yaw);
    h.speed = -3.2;
    h.x += f.x * h.speed * dt;
    h.y += f.y * h.speed * dt;
    if (h.reverseFor <= 0) {
      h.phase = "seek";
      h.stallId = null;
    }
    return;
  }

  if (!h.stallId || !sim.stalls.some((s) => s.id === h.stallId && s.claim === "none" && s.kind === "open")) {
    const next = pickStall(sim, h);
    h.stallId = next?.id ?? null;
    h.phase = "seek";
    h.stuck = 0;
    if (!next) {
      h.speed *= 0.9;
      return;
    }
  }
  const stall = sim.stalls.find((s) => s.id === h.stallId);
  if (!stall) return;
  if (playerInStall(sim, stall) && sim.parkHold > 0.05) {
    h.stallId = null;
    h.phase = "reverse";
    h.reverseFor = 0.7;
    return;
  }

  const target = h.phase === "enter" ? { x: stall.x, y: stall.y } : approachPoint(stall);
  const dx = target.x - h.x;
  const dy = target.y - h.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const desired = Math.atan2(-dx, dy);
  const diff = wrap(desired - h.yaw);
  const maxTurn = 2.6 * dt;
  h.yaw += clamp(diff, -maxTurn, maxTurn);
  const want = h.phase === "enter" ? 2.15 : dist < 5 ? 3.3 : 5.4;
  h.speed += clamp(want - h.speed, -10 * dt, 7 * dt);
  if (h.hesitate > 0) h.speed *= 0.4;
  const f = forward(h.yaw);
  h.x += f.x * h.speed * dt;
  h.y += f.y * h.speed * dt;

  if (dist + 0.15 < h.seenDist) {
    h.seenDist = dist;
    h.progress = 0;
  } else {
    h.progress += dt;
  }
  if (h.phase === "seek" && dist < 1.8) {
    h.phase = "enter";
    h.seenDist = 99;
    h.progress = 0;
  }
  const inside = stallHas(stall, h.x, h.y);
  if (h.phase === "enter" && inside && Math.abs(h.speed) < 2.4 && aligned(h.yaw, stall.facing)) {
    if (playerInStall(sim, stall)) {
      h.phase = "reverse";
      h.reverseFor = 0.8;
      h.stallId = null;
      return;
    }
    h.phase = "parked";
    h.x = stall.x;
    h.y = stall.y;
    h.yaw = parkYaw(stall);
    h.speed = 0;
    stall.claim = "ai";
    if (sim.player.y > sim.roadLength - 70) {
      sim.events.push("taken");
      popup(sim, stall.x, stall.y, "TAKEN");
      say(sim, "That stall just grew a car. Find another.");
    }
    return;
  }
  if (h.progress > 2.4) {
    h.phase = "reverse";
    h.reverseFor = 0.65;
    h.stallId = null;
    h.progress = 0;
    h.seenDist = 99;
  }
}

function circlesFor(t: Traffic) {
  const f = forward(t.yaw);
  if (t.kind === "bus" || t.kind === "rv") {
    const span = t.kind === "bus" ? 3.1 : 2.3;
    return [
      { x: t.x + f.x * span, y: t.y + f.y * span, r: 1.45 },
      { x: t.x, y: t.y, r: 1.45 },
      { x: t.x - f.x * span, y: t.y - f.y * span, r: 1.45 },
    ];
  }
  return [{ x: t.x, y: t.y, r: t.r }];
}

function resolveCircle(
  sim: Sim,
  cx: number,
  cy: number,
  r: number,
  hard: boolean,
  label: string,
) {
  const p = sim.player;
  const dx = p.x - cx;
  const dy = p.y - cy;
  const d = Math.hypot(dx, dy) || 0.0001;
  const min = r + 1.15;
  if (d >= min) return;
  const nx = dx / d;
  const ny = dy / d;
  p.x += nx * (min - d);
  p.y += ny * (min - d);
  const impact = Math.abs(p.speed);
  p.speed *= hard ? 0.28 : 0.55;
  if (hard && impact > 3.2) strike(sim, label, p.x, p.y);
  else if (impact > 2) {
    sim.trauma = Math.min(1, sim.trauma + 0.2);
    sim.events.push("scrape");
  }
}

function stepTraffic(sim: Sim, dt: number) {
  for (const t of sim.traffic) {
    t.y += t.speed * dt;
    const aheadY = t.y + Math.sign(t.speed || 1) * 3;
    const x0 = roadCenterX(t.y, sim.lake) + t.offset;
    const x1 = roadCenterX(aheadY, sim.lake) + t.offset;
    t.x = x0;
    t.yaw = Math.atan2(-(x1 - x0), aheadY - t.y);
    for (const c of circlesFor(t)) resolveCircle(sim, c.x, c.y, c.r, true, t.kind === "shuttle" ? "SHUTTLE" : "TRAFFIC");
  }
  sim.traffic = sim.traffic.filter((t) => t.y > -30 && t.y < sim.roadLength + 40);
}

function stepBodies(sim: Sim, dt: number) {
  for (const b of sim.bodies) {
    if (b.taken) continue;
    if (b.kind === "elk" || b.kind === "sheep" || b.kind === "bear") {
      b.x += Math.cos(sim.time * 0.55 + b.y) * 0.18 * dt;
      b.y += Math.sin(sim.time * 0.7 + b.x) * 0.12 * dt;
    }
    const dx = sim.player.x - b.x;
    const dy = sim.player.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > b.r + 1.15) continue;
    if (b.kind === "pass" || b.kind === "coffee") {
      b.taken = true;
      if (b.kind === "pass") {
        sim.hasPass = true;
        say(sim, "Park pass. The kiosk will pretend this was always the plan.");
        popup(sim, b.x, b.y, "PASS");
      } else {
        sim.hasCoffee = true;
        say(sim, "Coffee. Questionable temperature. Undeniable multiplier.");
        popup(sim, b.x, b.y, "×1.25");
      }
      sim.events.push("pickup");
      burst(sim, b.x, b.y, 8, "glow");
      continue;
    }
    const label =
      b.kind === "elk" ? "ELK" : b.kind === "bear" ? "BEAR" : b.kind === "sheep" ? "SHEEP" : b.kind === "rock" ? "ROCK" : b.kind === "chair" ? "CHAIR" : "PHOTO";
    resolveCircle(sim, b.x, b.y, b.r, true, label);
  }
}

function fillAStall(sim: Sim) {
  const options = openLegal(sim).filter((s) => !playerInStall(sim, s));
  if (options.length <= 1) return;
  let far = options[0]!;
  let best = -1;
  for (const s of options) {
    const d = Math.hypot(s.x - sim.player.x, s.y - sim.player.y);
    if (d > best) {
      best = d;
      far = s;
    }
  }
  if (sim.hunters.some((h) => h.stallId === far.id && h.phase === "enter")) return;
  far.claim = "static";
  sim.events.push("taken");
  popup(sim, far.x, far.y, "TAKEN");
  say(sim, "Another pair of headlights just made it legal. Move.");
}

function evaluateParking(sim: Sim, dt: number) {
  const p = sim.player;
  const slow = Math.abs(p.speed) < 0.55;
  let best: Stall | null = null;
  let bestCover = -1;
  const pts = corners(p.x, p.y, p.yaw);
  for (const s of sim.stalls) {
    if (!stallHas(s, p.x, p.y)) continue;
    const cover = pts.filter((pt) => stallHas(s, pt.x, pt.y)).length;
    if (cover > bestCover) {
      bestCover = cover;
      best = s;
    }
  }

  if (best && best.kind === "open" && best.claim === "none" && aligned(p.yaw, best.facing) && bestCover >= 3 && slow) {
    sim.parkHold += dt;
    guide(sim, "Hold still. The lines are considering you.");
    if (sim.parkHold > 0.5) {
      const off = Math.hypot(p.x - best.x, p.y - best.y);
      const ang = best.facing === "ns" ? Math.abs(Math.sin(p.yaw)) : 1 - Math.abs(Math.sin(p.yaw));
      sim.clean = 600 * (1 - clamp(off / 1.15, 0, 1)) * (1 - clamp(ang, 0, 1) * 0.45);
      sim.lakeside = best.row === "north";
      const remaining = openLegal(sim).filter((s) => s.id !== best.id);
      sim.lastStall = remaining.length === 0;
      best.claim = "player";
      win(sim);
      return;
    }
  } else if (best && best.kind === "open" && best.claim === "none" && stallHas(best, p.x, p.y)) {
    sim.parkHold = 0;
    if (!slow) guide(sim, "Brake. A stall is not a drive-through.");
    else if (!aligned(p.yaw, best.facing)) guide(sim, "Straighten. Crooked does not photograph well.");
    else guide(sim, "All the way in. Bumpers count.");
  } else {
    sim.parkHold = Math.max(0, sim.parkHold - dt * 2);
  }

  const illegalStall =
    best &&
    slow &&
    bestCover >= 3 &&
    (best.kind === "accessible" || best.kind === "decoy" || (best.kind === "open" && best.claim !== "none" && best.claim !== "player"));
  const inFire = inRect(p.x, p.y, sim.fire);
  const inBus = inRect(p.x, p.y, sim.bus);
  if ((illegalStall || (slow && (inFire || inBus))) && sim.phase === "drive") {
    sim.illegalHold += dt;
    if (inFire) guide(sim, "Fire lane. The lake is not an exemption.");
    else if (inBus) guide(sim, "That crescent is the bus loop.");
    else if (best?.kind === "accessible") guide(sim, "Accessible stall. Keep moving.");
    else if (best?.kind === "decoy") guide(sim, "A lawn chair is not a reservation.");
    else if (best?.claim === "ai" || best?.claim === "static") guide(sim, "Occupied. The scramble does not share.");
    if (sim.illegalHold > 0.72) {
      if (inFire) lose(sim, "Fire lane", "You stopped where the hydrants live. The turquoise was right there, and you parked on a rule.");
      else if (inBus) lose(sim, "Bus loop", "That crescent belongs to the 8:10 tour. The ranger has already seen the roof box.");
      else if (best?.kind === "accessible")
        lose(sim, "Not that stall", "Accessible parking is not a tactic. The pen was already out.");
      else if (best?.kind === "decoy")
        lose(sim, "Lawn-chair law", "Someone's camp chair does not hold a stall. It does hold a ticket.");
      else lose(sim, "Already taken", "You settled into a car that was already there. Bold. Cited.");
    }
  } else {
    sim.illegalHold = Math.max(0, sim.illegalHold - dt);
  }
}

function win(sim: Sim) {
  if (sim.phase !== "drive") return;
  const remain = Math.max(0, sim.gate - sim.clock);
  const arrival = Math.round(remain * 52);
  const clean = Math.round(sim.clean);
  const pass = sim.hasPass ? 250 : 0;
  const contact = sim.strikes === 0 ? 400 : 0;
  const lake = sim.lake === "moraine" ? 350 : 0;
  const side = sim.lakeside ? 220 : 0;
  const last = sim.lastStall ? 500 : 0;
  const dings = sim.strikes * 120;
  let total = 700 + arrival + clean + pass + contact + lake + side + last - dings;
  if (sim.hasCoffee) total = Math.round(total * 1.25);
  total = Math.max(0, total);
  sim.breakdown = {
    arrival,
    clean,
    pass,
    contact,
    lake,
    side,
    last,
    dings,
    coffee: sim.hasCoffee,
    total,
  };
  sim.score = total;
  sim.phase = "won";
  sim.paused = false;
  sim.events.push("win");
  sim.trauma = Math.min(1, sim.trauma + 0.35);
  burst(sim, sim.player.x, sim.player.y, 16, "glow");
}

export function stepSim(sim: Sim, dt: number, actions: Actions) {
  sim.events.length = 0;
  sim.time += dt;
  if (sim.hitstop > 0) {
    sim.hitstop -= dt;
    sim.flash = Math.max(0, sim.flash - dt);
    return;
  }
  sim.flash = Math.max(0, sim.flash - dt);
  sim.trauma = Math.max(0, sim.trauma - dt * 1.4);
  sim.invuln = Math.max(0, sim.invuln - dt);
  sim.honkCd = Math.max(0, sim.honkCd - dt);
  sim.brakeLight = actions.brake ? 1 : Math.max(0, sim.brakeLight - dt * 5);
  for (const particle of sim.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
  }
  sim.particles = sim.particles.filter((p) => p.life > 0);
  for (const pop of sim.popups) {
    pop.life -= dt;
    pop.y += dt * 1.4;
  }
  sim.popups = sim.popups.filter((p) => p.life > 0);
  if (sim.messageT > 0) sim.messageT -= dt;

  if (sim.phase !== "drive" || sim.paused) return;

  sim.clock += dt;
  const p = sim.player;
  const inLot = inRect(p.x, p.y, sim.lot, 1) || p.y > sim.roadLength - 1;
  const max = inLot ? 7.4 : 15.2;
  if (actions.throttle && p.speed < max) p.speed += 12.5 * dt;
  if (actions.brake) {
    if (p.speed > 0.25) p.speed -= 24 * dt;
    else p.speed -= 9 * dt;
  }
  p.speed = clamp(p.speed, -4.6, max);
  if (!actions.throttle && !actions.brake) {
    const drag = (inLot ? 3.1 : 1.15) * dt;
    if (Math.abs(p.speed) <= drag) p.speed = 0;
    else p.speed -= Math.sign(p.speed) * drag;
  }

  const spF = clamp(Math.abs(p.speed) / 3.4, 0.45, 1);
  const reverse = p.speed >= 0 ? 1 : -1;
  p.yaw += actions.steer * 2.45 * spF * reverse * dt;
  p.yaw = wrap(p.yaw);
  const f = forward(p.yaw);
  p.x += f.x * p.speed * dt;
  p.y += f.y * p.speed * dt;

  if (actions.honk && sim.honkCd <= 0) {
    sim.honkCd = 0.45;
    sim.events.push("honk");
    for (const h of sim.hunters) {
      if (h.phase === "parked") continue;
      if (Math.hypot(h.x - p.x, h.y - p.y) < 16) h.hesitate = 0.7;
    }
  }

  if (p.y < sim.roadLength + 8 && !inRect(p.x, p.y, sim.lot)) {
    const cx = roadCenterX(p.y, sim.lake);
    const lim = roadHalf(p.y, sim.roadLength, sim.roadWidth);
    const lat = p.x - cx;
    const pen = Math.abs(lat) - lim;
    if (pen > 0 && p.y < sim.roadLength - 1) {
      p.x = cx + Math.sign(lat) * lim;
      if (pen > 0.85 && Math.abs(p.speed) > 6) strike(sim, "DITCH", p.x, p.y);
      else {
        p.speed *= 0.86;
        if (pen > 0.2 && Math.abs(p.speed) > 2) {
          sim.events.push("scrape");
          burst(sim, p.x, p.y, 3, "dust");
        }
      }
    }
  }

  if (inRect(p.x, p.y, sim.water)) {
    sim.waterHold += dt;
    p.speed *= 0.9;
    if (sim.waterHold > 0.28) {
      lose(sim, "That's the lake", "The turquoise is for looking at. The rental agreement is painfully clear.");
    }
  } else sim.waterHold = 0;

  if (p.y < -6) {
    lose(sim, "Back to Canmore", "You reversed out of the morning. The stalls filled without you, which is a kind of rest.");
  }

  for (const beat of sim.beats) {
    if (!beat.fired && p.y > beat.y) {
      beat.fired = true;
      say(sim, beat.text);
    }
  }

  if (!sim.boothPassed && p.y >= sim.boothY) {
    sim.boothPassed = true;
    if (!sim.hasPass) {
      lose(
        sim,
        "No park pass",
        "The kiosk sent you back down the valley. The pass was on the road. It even had a little maple leaf.",
      );
      return;
    }
    say(sim, "Pass checked. The person in the booth looks tired, and a little impressed.");
  }

  stepBodies(sim, dt);
  stepTraffic(sim, dt);

  for (const h of sim.hunters) {
    stepHunter(sim, h, dt);
    if (h.phase === "parked") continue;
    const dx = p.x - h.x;
    const dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 0.0001;
    const min = 2.25;
    if (d < min) {
      const nx = dx / d;
      const ny = dy / d;
      const push = (min - d) / 2;
      p.x += nx * push;
      p.y += ny * push;
      h.x -= nx * push;
      h.y -= ny * push;
      const impact = Math.abs(p.speed) + Math.abs(h.speed);
      p.speed *= 0.62;
      h.speed *= 0.45;
      h.stuck += 0.4;
      if (impact > 6.2) strike(sim, "BUMP", p.x, p.y);
      else {
        sim.trauma = Math.min(1, sim.trauma + 0.15);
        burst(sim, (p.x + h.x) / 2, (p.y + h.y) / 2, 4, "dust");
      }
    }
  }

  for (const s of sim.stalls) {
    if (s.claim !== "static" && s.claim !== "ai") continue;
    resolveCircle(sim, s.x, s.y, 1.55, false, "PARKED");
  }

  if (sim.player.y > sim.roadLength - 8) {
    sim.fillTimer += dt;
    if (sim.fillTimer >= sim.fillEvery) {
      sim.fillTimer = 0;
      fillAStall(sim);
    }
  }

  if (sim.phase !== "drive") return;

  evaluateParking(sim, dt);

  if (openLegal(sim).length === 0 && sim.parkHold < 0.15 && sim.phase === "drive") {
    lose(sim, "Lot full", "Every legal line has a car in it. You can see the colour of the water and not one honest stall.");
    return;
  }

  if (sim.clock >= sim.gate && sim.phase === "drive") {
    if (!sim.grace && sim.parkHold > 0.15) {
      sim.grace = true;
      sim.gate += 2;
      say(sim, "The arm is dropping. You are already in the lines. Hold.");
    } else {
      const clock = formatClock(sim.clock, sim.gate);
      lose(
        sim,
        "The arm came down",
        `Gate at ${clock}. A shuttle will have you there after the light has gone ordinary.`,
      );
    }
  }

  if (inLot && sim.parkHold <= 0 && sim.hint.startsWith("Grab")) {
    guide(sim, "Empty stalls glow. Stop square inside one.");
  }
}

export function formatClock(elapsed: number, gate: number) {
  const start = 4 * 60 + 48;
  const end = 5 * 60 + 56;
  const u = clamp(elapsed / Math.max(1, gate), 0, 1.15);
  const mins = start + (end - start) * Math.min(u, 1);
  const m = Math.floor(mins);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = hh % 12 || 12;
  const ap = hh >= 12 ? "PM" : "AM";
  return `${h12}:${mm.toString().padStart(2, "0")} ${ap}`;
}

export function openCount(sim: Sim) {
  return openLegal(sim).length;
}

export function parkedYawFor(row: Stall["row"]) {
  return parkYaw({ row } as Stall);
}

export { CAR_L, CAR_W };
