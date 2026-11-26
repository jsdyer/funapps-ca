import { createAudio, type SeaAudio } from "@/game/audio";
import { loadArt, type ArtBook } from "@/game/assets";
import {
  BELL_SECONDS,
  BOAT_R,
  GRACE_SECONDS,
  HAUL_RANGE,
  HOLD_MAX,
  MAX_SPEED,
  ORDER_LB,
  PRICE,
  SLOW_SPEED,
  TURN_RATE,
} from "@/game/content";
import { bakeLand, drawFrame, type Critter, type Floater, type Particle } from "@/game/render";
import { loadSave, writeSave, type SaveData } from "@/game/save";
import type { GameApi, HaulReason, Lobster, LobsterKind, Payday, Phase, UiSnapshot } from "@/game/types";
import {
  BUOYS,
  DOCK,
  GULLS,
  KELP,
  onLand,
  RIVAL_PATH,
  ROCKS,
  SPAWN,
  WORLD_H,
  WORLD_W,
  heading,
  yawToward,
} from "@/game/world";

type Buoy = { id: number; x: number; y: number; mine: boolean; spent: boolean };
type Listener = (ui: UiSnapshot) => void;

const FIXED = 1 / 60;

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setSteer?: (v: number) => void;
      setKeys?: (codes: string[]) => void;
    };
  }
}

export function mountGame(canvas: HTMLCanvasElement, onUi: Listener): GameApi {
  const audio: SeaAudio = createAudio();
  const save = loadSave();
  audio.setMuted(!save.sound);
  let land: HTMLCanvasElement | null = null;
  let force = true;
  const art: ArtBook = loadArt(() => {
    land = bakeLand(art);
    force = true;
  });
  land = bakeLand(art);

  const ctx = canvas.getContext("2d");
  if (!ctx) return noop(onUi);

  let phase: Phase = "title";
  let bell = BELL_SECONDS;
  let grace = false;
  let graceLeft = 0;
  let hold: Lobster[] = [];
  let bumps = 0;
  let combo = 0;
  let bestCombo = 0;
  let hauledCount = 0;
  let lastHaulAt = -99;
  let serial = 1;
  let payday: Payday | null = null;
  let time = 0;
  let freeze = 0;
  let trauma = 0;
  let lean = 0;
  let hauling = false;
  let haulT = 0;
  let haulPopped = false;
  let haulId = -1;
  let bumpCd = 0;
  let honkCd = 0;
  let wakeAcc = 0;
  let bubbleAcc = 0;
  let uiAcc = 0;
  let spaceWas = false;
  let dockWas = false;
  let escWas = false;
  let alive = true;
  let touchSteer = 0;
  let touchThrottle = 0;
  let probeSteer: number | null = null;
  let injected: Set<string> | null = null;
  const realKeys = new Set<string>();
  let cssW = 1;
  let cssH = 1;
  let coarse = window.matchMedia("(pointer: coarse), (max-width: 800px)").matches;
  let camX = SPAWN.x;
  let camY = SPAWN.y;

  const boat = { x: SPAWN.x, y: SPAWN.y, yaw: 0, speed: 0 };
  const rival = { x: RIVAL_PATH[0][0], y: RIVAL_PATH[0][1], yaw: 0, speed: 78 };
  let rivalIndex = 1;
  let buoys: Buoy[] = [];
  const particles: Particle[] = Array.from({ length: 180 }, emptyParticle);
  const floats: Floater[] = Array.from({ length: 14 }, emptyFloat);
  const critters: Critter[] = Array.from({ length: 10 }, emptyCritter);

  beginMorning();

  const media = window.matchMedia("(pointer: coarse), (max-width: 800px)");
  const onMedia = () => {
    coarse = media.matches;
  };
  media.addEventListener("change", onMedia);

  const onKeyDown = (event: KeyboardEvent) => {
    realKeys.add(event.code);
    if (event.code.startsWith("Arrow") || event.code === "Space") event.preventDefault();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    realKeys.delete(event.code);
  };
  const onBlur = () => {
    realKeys.clear();
    touchSteer = 0;
    touchThrottle = 0;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  const onVis = () => {
    if (document.visibilityState === "visible") audio.unlock();
  };
  document.addEventListener("visibilitychange", onVis);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  window.__controlsTest = {
    getYaw: () => boat.yaw,
    getSpeed: () => boat.speed,
    setSteer: (value) => {
      probeSteer = value;
    },
    setKeys: (codes) => {
      injected = new Set(codes);
    },
  };

  let last = performance.now();
  let acc = 0;
  let raf = 0;

  const loop = (now: number) => {
    if (!alive) return;
    const real = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (freeze > 0) {
      freeze = Math.max(0, freeze - real);
      time += real * 0.2;
    } else if (phase === "playing") {
      acc += real;
      let steps = 0;
      while (acc >= FIXED && steps < 5) {
        step(FIXED);
        time += FIXED;
        acc -= FIXED;
        steps++;
      }
    } else {
      time += real;
      driftAmbience(real);
      acc = 0;
    }
    trauma = Math.max(0, trauma - real * 1.45);
    followCamera(real);
    audio.setEngine(phase === "playing" ? Math.abs(boat.speed) / MAX_SPEED : 0);
    if (save.sound && Math.random() < real * 0.07) audio.gull();
    uiAcc += real;
    if (force || uiAcc > 0.12) {
      uiAcc = 0;
      force = false;
      onUi(snapshot());
    }
    paint();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  function held(code: string) {
    if (injected) return injected.has(code);
    return realKeys.has(code);
  }

  function step(dt: number) {
    bumpCd = Math.max(0, bumpCd - dt);
    honkCd = Math.max(0, honkCd - dt);
    const space = held("Space");
    if (space && !spaceWas) tryHaul();
    spaceWas = space;
    const dockKey = held("KeyE");
    if (dockKey && !dockWas) tryDock();
    dockWas = dockKey;
    const esc = held("Escape");
    if (esc && !escWas) togglePause();
    escWas = esc;

    let steer = touchSteer;
    let throttle = touchThrottle;
    if (held("KeyA") || held("ArrowLeft")) steer += 1;
    if (held("KeyD") || held("ArrowRight")) steer -= 1;
    if (held("KeyW") || held("ArrowUp")) throttle += 1;
    if (held("KeyS") || held("ArrowDown")) throttle -= 1;
    steer = clamp(steer, -1, 1);
    throttle = clamp(throttle, -1, 1);
    if (probeSteer !== null) steer = clamp(probeSteer, -1, 1);

    if (!hauling) {
      const target = throttle * MAX_SPEED;
      boat.speed += (target - boat.speed) * (1 - Math.exp(-2.4 * dt));
      const reverse = boat.speed >= 0 ? 1 : -1;
      const factor = Math.max(0.55, Math.min(1, Math.abs(boat.speed) / MAX_SPEED));
      boat.yaw += steer * TURN_RATE * factor * reverse * dt;
      const fwd = heading(boat.yaw);
      boat.x += fwd.x * boat.speed * dt;
      boat.y += fwd.y * boat.speed * dt;
      const want = steer * Math.min(1, Math.abs(boat.speed) / MAX_SPEED) * 0.2;
      lean += (want - lean) * (1 - Math.exp(-8 * dt));
    } else {
      boat.speed += (0 - boat.speed) * (1 - Math.exp(-7 * dt));
      lean += (0 - lean) * (1 - Math.exp(-6 * dt));
      haulT += dt;
      const buoy = buoys.find((item) => item.id === haulId);
      bubbleAcc += dt;
      if (buoy && bubbleAcc > 0.07) {
        bubbleAcc = 0;
        puff(buoy.x, buoy.y, "bubble", 1);
      }
      if (haulT > 0.68 && !haulPopped) {
        haulPopped = true;
        if (buoy) buoy.spent = true;
        resolveCatch(buoy ?? null);
      }
      if (haulT > 1.05) hauling = false;
    }

    for (const patch of KELP) {
      if (Math.hypot(boat.x - patch.x, boat.y - patch.y) < patch.r) {
        boat.speed *= 1 - 0.85 * dt;
      }
    }

    boat.x = clamp(boat.x, 30, WORLD_W - 30);
    boat.y = clamp(boat.y, 30, WORLD_H - 30);
    shoveLand(boat, BOAT_R, true);
    shoveRocks(boat, BOAT_R, true);

    const wp = RIVAL_PATH[rivalIndex] ?? RIVAL_PATH[0];
    const desired = yawToward(rival.x, rival.y, wp[0], wp[1]);
    const diff = Math.atan2(Math.sin(desired - rival.yaw), Math.cos(desired - rival.yaw));
    rival.yaw += clamp(diff, -1.5 * dt, 1.5 * dt);
    const rf = heading(rival.yaw);
    rival.x += rf.x * rival.speed * dt;
    rival.y += rf.y * rival.speed * dt;
    if (Math.hypot(wp[0] - rival.x, wp[1] - rival.y) < 48) {
      rivalIndex = (rivalIndex + 1) % RIVAL_PATH.length;
    }
    shoveLand(rival, 30, false);
    separateBoats();

    if (Math.abs(boat.speed) > 40 && !hauling) {
      wakeAcc += dt;
      const fwd = heading(boat.yaw);
      const right = { x: -fwd.y, y: fwd.x };
      while (wakeAcc > 0.045) {
        wakeAcc -= 0.045;
        const side = Math.random() < 0.5 ? -1 : 1;
        puff(boat.x - fwd.x * 42 + right.x * side * 14, boat.y - fwd.y * 42 + right.y * side * 14, "wake", 1, -fwd.x * 18, -fwd.y * 18);
      }
    }

    if (!grace) {
      bell -= dt;
      if (bell <= 0) {
        bell = 0;
        grace = true;
        graceLeft = GRACE_SECONDS;
        audio.bell();
        pushFloat("The bell", boat.x, boat.y - 46, "gold");
        force = true;
      }
    } else {
      graceLeft -= dt;
      if (graceLeft <= 0) finish(true);
    }

    driftAmbience(dt);
  }

  function driftAmbience(dt: number) {
    for (const particle of particles) {
      if (particle.life <= 0) continue;
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - 1.4 * dt;
      particle.vy *= 1 - 1.4 * dt;
    }
    for (const floater of floats) if (floater.life > 0) floater.life -= dt;
    for (const critter of critters) {
      if (critter.life <= 0) continue;
      critter.life -= dt;
      critter.vy += 220 * dt;
      critter.x += critter.vx * dt;
      critter.y += critter.vy * dt;
      critter.rot += dt * 5;
    }
  }

  function tryHaul() {
    if (phase !== "playing" || hauling) return;
    if (hold.length >= HOLD_MAX) {
      pushFloat("Crate is full", boat.x, boat.y - 36, "soft");
      return;
    }
    const near = nearest(true);
    const blue = nearest(false);
    if (blue && !blue.buoy.spent && blue.dist < HAUL_RANGE && (!near || blue.dist < near.dist)) {
      pushFloat("Not your colors", blue.buoy.x, blue.buoy.y - 28, "soft");
      audio.honk();
      return;
    }
    if (!near || near.buoy.spent || near.dist > HAUL_RANGE) return;
    if (Math.abs(boat.speed) > SLOW_SPEED) {
      pushFloat("Ease off", boat.x, boat.y - 30, "soft");
      return;
    }
    hauling = true;
    haulT = 0;
    haulPopped = false;
    haulId = near.buoy.id;
    audio.haul();
    force = true;
  }

  function tryDock() {
    if (phase !== "playing" || hauling || !dockable()) return;
    boat.speed = 0;
    finish(false);
  }

  function dockable() {
    const dist = Math.hypot(boat.x - DOCK.x, boat.y - DOCK.y);
    return dist <= DOCK.r && (hold.length > 0 || hauledCount > 0 || grace);
  }

  function resolveCatch(buoy: Buoy | null) {
    const roll = Math.random();
    let count = 1;
    let kind: LobsterKind = "keeper";
    let each = 1.4 + Math.random() * 0.4;
    let text = "Keeper";
    let tone: Floater["tone"] = "good";
    let pop: "good" | "gold" | "soft" = "good";
    if (roll < 0.04) {
      count = 0;
      text = "Short set";
      tone = "soft";
      pop = "soft";
    } else if (roll < 0.18) {
      kind = "jumbo";
      each = 2.5 + Math.random() * 0.6;
      text = "Jumbo";
      tone = "gold";
      pop = "gold";
    } else if (roll < 0.26) {
      kind = "small";
      count = 3;
      each = 0.8 + Math.random() * 0.25;
      text = "A little crowd";
    } else if (roll < 0.62) {
      count = 2;
      each = 1.15 + Math.random() * 0.4;
      text = "Two keepers";
    }
    const room = HOLD_MAX - hold.length;
    const keep = Math.min(count, room);
    for (let i = 0; i < keep; i++) {
      hold.push({ id: serial++, lbs: Math.round(each * 10) / 10, kind });
      if (buoy) launchCritter(buoy.x, buoy.y);
    }
    if (count > 0 && keep < count) text = "Crate almost full";
    if (keep > 0) {
      const clean = bumps === 0 || time - lastHaulAt < 16;
      combo = lastHaulAt > 0 && time - lastHaulAt < 16 && clean ? combo + 1 : 1;
      if (combo > bestCombo) bestCombo = combo;
      lastHaulAt = time;
      if (combo >= 2) text = `${text} · ${combo}`;
    }
    hauledCount += 1;
    audio.pop(pop);
    audio.splash();
    trauma = Math.min(1, trauma + (tone === "gold" ? 0.34 : 0.18));
    if (!save.calm) freeze = 0.07;
    const origin = buoy ?? boat;
    pushFloat(text, origin.x, origin.y - 26, tone);
    puff(origin.x, origin.y, "splash", 8);
    force = true;
  }

  function finish(towed: boolean) {
    if (phase === "payday") return;
    const pounds = round1(hold.reduce((sum, lobster) => sum + lobster.lbs, 0));
    const bonus = bestCombo >= 3 ? 12 : 0;
    const pay = Math.round(pounds * PRICE) + bonus;
    const stars = scoreStars(pounds);
    let line = "A modest morning. The string will be here tomorrow.";
    if (towed) line = "The tender towed you home. The catch is fine.";
    else if (stars >= 3) line = "Clean hull, order filled. The buyer grinned.";
    else if (stars === 2) line = "Order filled. Shelburne eats well tonight.";
    else if (pounds <= 0) line = "Nothing to weigh. The pots are patient.";
    payday = { pounds, pay, bonus, stars, line, towed, count: hold.length };
    save.bestLb = Math.max(save.bestLb, pounds);
    save.bestPay = Math.max(save.bestPay, pay);
    save.mornings += 1;
    writeSave(save);
    phase = "payday";
    hauling = false;
    boat.speed = 0;
    audio.coin();
    audio.bell();
    force = true;
  }

  function scoreStars(pounds: number) {
    if (pounds >= ORDER_LB && bumps === 0) return 3;
    if (pounds >= ORDER_LB) return 2;
    if (hauledCount > 0) return 1;
    return 0;
  }

  function nearest(mine: boolean) {
    let best: Buoy | null = null;
    let dist = Infinity;
    for (const buoy of buoys) {
      if (buoy.mine !== mine || buoy.spent) continue;
      const d = Math.hypot(buoy.x - boat.x, buoy.y - boat.y);
      if (d < dist) {
        dist = d;
        best = buoy;
      }
    }
    return best ? { buoy: best, dist } : null;
  }

  function shoveLand(body: { x: number; y: number; speed: number }, radius: number, player: boolean) {
    for (let pass = 0; pass < 4; pass++) {
      if (!hitsLand(body.x, body.y, radius)) return;
      if (onLand(body.x, body.y)) {
        let escaped = false;
        for (let dist = 10; dist < 280 && !escaped; dist += 10) {
          for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const x = body.x + Math.cos(angle) * dist;
            const y = body.y + Math.sin(angle) * dist;
            if (!onLand(x, y)) {
              body.x = x;
              body.y = y;
              escaped = true;
              break;
            }
          }
        }
        if (player) {
          body.speed *= 0.3;
          noteBump();
        }
        return;
      }
      let px = 0;
      let py = 0;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const x = body.x + Math.cos(angle) * radius;
        const y = body.y + Math.sin(angle) * radius;
        if (onLand(x, y)) {
          px += body.x - x;
          py += body.y - y;
        }
      }
      const mag = Math.hypot(px, py) || 1;
      body.x += (px / mag) * 7;
      body.y += (py / mag) * 7;
      if (player) {
        body.speed *= 0.62;
        noteBump();
      }
    }
  }

  function shoveRocks(body: { x: number; y: number; speed: number }, radius: number, player: boolean) {
    for (const rock of ROCKS) {
      const dx = body.x - rock.x;
      const dy = body.y - rock.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const min = radius + rock.r * 0.72;
      if (dist >= min) continue;
      body.x = rock.x + (dx / dist) * min;
      body.y = rock.y + (dy / dist) * min;
      if (player) {
        body.speed *= 0.42;
        noteBump();
      }
    }
  }

  function noteBump() {
    if (bumpCd > 0) return;
    bumpCd = 0.65;
    bumps += 1;
    combo = 0;
    trauma = Math.min(1, trauma + 0.42);
    audio.splash();
    puff(boat.x, boat.y, "splash", 7);
    pushFloat("Easy", boat.x, boat.y - 34, "soft");
    force = true;
  }

  function separateBoats() {
    const dx = boat.x - rival.x;
    const dy = boat.y - rival.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const min = BOAT_R + 30;
    if (dist >= min) return;
    const nx = dx / dist;
    const ny = dy / dist;
    const push = min - dist;
    boat.x += nx * push;
    boat.y += ny * push;
    boat.speed *= 0.55;
    if (honkCd <= 0) {
      honkCd = 1.3;
      audio.honk();
      trauma = Math.min(1, trauma + 0.22);
      pushFloat("Other boat", boat.x, boat.y - 30, "soft");
    }
  }

  function followCamera(dt: number) {
    const fwd = heading(boat.yaw);
    let tx = boat.x + fwd.x * (coarse ? 80 : 140);
    let ty = boat.y + fwd.y * (coarse ? 80 : 140);
    if (phase === "title") {
      tx = boat.x + 240 + Math.sin(time * 0.18) * 80;
      ty = boat.y - 20;
    }
    const k = 1 - Math.exp(-2.7 * dt);
    camX += (tx - camX) * k;
    camY += (ty - camY) * k;
    camX = clamp(camX, 480, WORLD_W - 480);
    camY = clamp(camY, 360, WORLD_H - 360);
  }

  function paint() {
    const viewW = coarse ? 760 : 1180;
    const scale = cssW / viewW;
    const mag = save.calm ? 0 : trauma * trauma;
    const next = nextBuoy();
    const showWharf = hold.length >= 4 || grace || bell < 28 || !next;
    const guide =
      phase === "playing" && !dockable()
        ? showWharf
          ? { x: DOCK.x, y: DOCK.y, label: "Wharf", tone: "wharf" as const }
          : next
            ? { x: next.x, y: next.y, label: "Your pot", tone: "pot" as const }
            : null
        : null;
    const haulBuoy = buoys.find((item) => item.id === haulId);
    drawFrame(ctx!, {
      art,
      land,
      width: cssW,
      height: cssH,
      camX,
      camY,
      scale,
      biasY: phase === "title" ? (coarse ? -cssH * 0.22 : 0) : coarse ? -cssH * 0.08 : 0,
      shakeX: (noise(time * 31) * 2 - 1) * 14 * mag,
      shakeY: (noise(time * 26 + 3) * 2 - 1) * 10 * mag,
      time,
      fog: grace ? 0.85 : bell < 28 ? (28 - bell) / 28 : 0,
      boat: { x: boat.x, y: boat.y + Math.sin(time * 2.1) * (save.calm ? 0 : 1.5), yaw: boat.yaw, lean },
      rival: { x: rival.x, y: rival.y, yaw: rival.yaw },
      buoys: buoys.map((buoy) => ({
        ...buoy,
        next: Boolean(next && buoy.id === next.id && !showWharf),
      })),
      gulls: GULLS.map((gull, index) => gullSpot(index, gull)),
      kelp: KELP.map((patch) => ({ x: patch.x, y: patch.y, rot: patch.rot })),
      particles,
      floats,
      critters,
      haul:
        hauling && haulBuoy
          ? {
              fromX: haulBuoy.x,
              fromY: haulBuoy.y,
              x: haulBuoy.x + (boat.x - haulBuoy.x) * Math.min(1, haulT / 0.7) * 0.7,
              y: haulBuoy.y + (boat.y - haulBuoy.y) * Math.min(1, haulT / 0.7) * 0.7 - Math.sin(Math.min(1, haulT / 0.7) * Math.PI) * 16,
            }
          : null,
      dock: { x: DOCK.x, y: DOCK.y, r: DOCK.r, hot: phase === "playing" && (hold.length > 0 || grace) },
      guide,
      calm: save.calm,
    });
  }

  function gullSpot(index: number, gull: (typeof GULLS)[number]) {
    const angle = time * gull.speed + gull.phase + index;
    const x = gull.cx + Math.cos(angle) * gull.rx;
    const y = gull.cy + Math.sin(angle) * gull.ry;
    const nx = gull.cx + Math.cos(angle + 0.08) * gull.rx;
    const ny = gull.cy + Math.sin(angle + 0.08) * gull.ry;
    return { x, y, yaw: yawToward(x, y, nx, ny) };
  }

  function nextBuoy() {
    let best: Buoy | null = null;
    let dist = Infinity;
    for (const buoy of buoys) {
      if (!buoy.mine || buoy.spent) continue;
      const d = Math.hypot(buoy.x - boat.x, buoy.y - boat.y);
      if (d < dist) {
        dist = d;
        best = buoy;
      }
    }
    return best;
  }

  function snapshot(): UiSnapshot {
    const pounds = round1(hold.reduce((sum, lobster) => sum + lobster.lbs, 0));
    const mine = nearest(true);
    const blue = nearest(false);
    let haulReason: HaulReason = "none";
    let canHaul = false;
    if (phase === "playing") {
      if (hauling) haulReason = "busy";
      else if (hold.length >= HOLD_MAX) haulReason = "full";
      else if (blue && blue.dist < HAUL_RANGE && (!mine || blue.dist < mine.dist)) haulReason = "blue";
      else if (mine && mine.dist <= HAUL_RANGE) {
        if (Math.abs(boat.speed) > SLOW_SPEED) haulReason = "fast";
        else {
          haulReason = "ready";
          canHaul = true;
        }
      } else haulReason = "far";
    }
    const potsLeft = buoys.filter((buoy) => buoy.mine && !buoy.spent).length;
    return {
      phase,
      bell: grace ? graceLeft : bell,
      grace,
      hold: hold.slice(),
      holdMax: HOLD_MAX,
      pounds,
      orderLb: ORDER_LB,
      price: PRICE,
      canHaul,
      haulReason,
      canDock: phase === "playing" && dockable(),
      hint: makeHint(canHaul),
      bumps,
      combo,
      sound: save.sound,
      calm: save.calm,
      bestLb: round1(save.bestLb),
      bestPay: save.bestPay,
      mornings: save.mornings,
      payday,
      potsLeft,
      potTotal: buoys.filter((buoy) => buoy.mine).length,
    };
  }

  function makeHint(canHaul: boolean) {
    if (phase !== "playing") return "";
    if (hauling) return "Winch is turning. She'll come up.";
    if (dockable() && (hold.length > 0 || grace)) return "You're alongside. Tie up and get paid.";
    if (hold.length >= HOLD_MAX) return "Crate's full. Follow the arrow to the wharf.";
    if (grace) return "The bell has rung. Bring them in.";
    if (canHaul) return "Nice and slow. Haul the pot.";
    const mine = nearest(true);
    if (mine && mine.dist < HAUL_RANGE && Math.abs(boat.speed) > SLOW_SPEED) return "Ease off the throttle, then haul.";
    const blue = nearest(false);
    if (blue && blue.dist < HAUL_RANGE + 10) return "Blue buoys belong to the other boat.";
    if (hauledCount === 0) return "Steam to the red buoy with the gold ring.";
    if (bell < 35) return "Morning's getting on. Haul another, or head for the wharf.";
    return "Your pots are the red-and-yellow ones. Follow the string.";
  }

  function beginMorning() {
    bell = BELL_SECONDS;
    grace = false;
    graceLeft = 0;
    hold = [];
    bumps = 0;
    combo = 0;
    bestCombo = 0;
    hauledCount = 0;
    lastHaulAt = -99;
    hauling = false;
    haulT = 0;
    payday = null;
    boat.x = SPAWN.x;
    boat.y = SPAWN.y;
    boat.speed = 0;
    boat.yaw = yawToward(SPAWN.x, SPAWN.y, BUOYS[0].x, BUOYS[0].y);
    lean = 0;
    buoys = BUOYS.map((buoy, index) => ({ ...buoy, id: index + 1, spent: false }));
    rival.x = RIVAL_PATH[0][0];
    rival.y = RIVAL_PATH[0][1];
    rival.yaw = yawToward(rival.x, rival.y, RIVAL_PATH[1][0], RIVAL_PATH[1][1]);
    rivalIndex = 1;
    for (const particle of particles) particle.life = 0;
    for (const floater of floats) floater.life = 0;
    for (const critter of critters) critter.life = 0;
    camX = boat.x + 180;
    camY = boat.y;
    force = true;
  }

  function togglePause() {
    if (phase === "playing") phase = "paused";
    else if (phase === "paused") phase = "playing";
    force = true;
  }

  function persist() {
    writeSave(save);
    force = true;
  }

  function puff(x: number, y: number, kind: Particle["kind"], count: number, vx = 0, vy = 0) {
    for (let i = 0; i < count; i++) {
      const particle = particles.find((item) => item.life <= 0);
      if (!particle) return;
      particle.x = x + (Math.random() - 0.5) * 12;
      particle.y = y + (Math.random() - 0.5) * 12;
      particle.vx = vx + (Math.random() - 0.5) * 50;
      particle.vy = vy + (Math.random() - 0.5) * 50;
      particle.life = kind === "wake" ? 0.7 : 0.45;
      particle.max = particle.life;
      particle.kind = kind;
      particle.r = kind === "bubble" ? 4 : 5 + Math.random() * 4;
    }
  }

  function pushFloat(text: string, x: number, y: number, tone: Floater["tone"]) {
    const floater = floats.find((item) => item.life <= 0) ?? floats[0];
    floater.x = x;
    floater.y = y;
    floater.text = text;
    floater.life = 1.15;
    floater.max = 1.15;
    floater.tone = tone;
  }

  function launchCritter(x: number, y: number) {
    const critter = critters.find((item) => item.life <= 0);
    if (!critter) return;
    critter.x = x;
    critter.y = y;
    critter.vx = (boat.x - x) * 1.4 + (Math.random() - 0.5) * 30;
    critter.vy = (boat.y - y) * 1.4 - 90;
    critter.life = 0.75;
    critter.rot = Math.random() * 4;
  }

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      media.removeEventListener("change", onMedia);
      if (window.__controlsTest) delete window.__controlsTest;
      audio.destroy();
    },
    start() {
      audio.unlock();
      beginMorning();
      phase = "playing";
      force = true;
    },
    haul() {
      audio.unlock();
      tryHaul();
    },
    dock() {
      audio.unlock();
      tryDock();
    },
    again() {
      audio.unlock();
      beginMorning();
      phase = "playing";
      force = true;
    },
    toggleSound() {
      save.sound = !save.sound;
      audio.setMuted(!save.sound);
      persist();
    },
    toggleCalm() {
      save.calm = !save.calm;
      persist();
    },
    togglePause,
    setTouch(steer, throttle) {
      touchSteer = steer;
      touchThrottle = throttle;
    },
  };
}

function emptyParticle(): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, kind: "wake", r: 4 };
}
function emptyFloat(): Floater {
  return { x: 0, y: 0, text: "", life: 0, max: 1, tone: "good" };
}
function emptyCritter(): Critter {
  return { x: 0, y: 0, vx: 0, vy: 0, life: 0, rot: 0 };
}

function hitsLand(x: number, y: number, radius: number) {
  if (onLand(x, y)) return true;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    if (onLand(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)) return true;
  }
  return false;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function noise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function noop(onUi: Listener): GameApi {
  onUi({
    phase: "title",
    bell: BELL_SECONDS,
    grace: false,
    hold: [],
    holdMax: HOLD_MAX,
    pounds: 0,
    orderLb: ORDER_LB,
    price: PRICE,
    canHaul: false,
    haulReason: "none",
    canDock: false,
    hint: "",
    bumps: 0,
    combo: 0,
    sound: true,
    calm: false,
    bestLb: 0,
    bestPay: 0,
    mornings: 0,
    payday: null,
    potsLeft: 8,
    potTotal: 8,
  });
  return {
    destroy() {},
    start() {},
    haul() {},
    dock() {},
    again() {},
    toggleSound() {},
    toggleCalm() {},
    togglePause() {},
    setTouch() {},
  };
}
