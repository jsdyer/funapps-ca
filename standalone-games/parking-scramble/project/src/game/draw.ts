import { roadCenterX, roadHalf } from "./level";
import { clamp, forward } from "./math";
import { parkedYawFor } from "./sim";
import type { Body, Hunter, Sim, Stall, Traffic } from "./types";

const NIGHT = "#102033";
const FOREST = "#0c221c";
const PINE = "#16382c";
const PINE_LIT = "#1e4d3c";
const ASPHALT = "#2a333b";
const SHOULDER = "#3a4038";
const SNOW = "#e7e2d4";
const GLACIER = "#1aa8a4";
const GLOW = "#e39b73";
const DANGER = "#c6453a";
const HEAD = "#ffe7a8";

function w2s(sim: Sim, x: number, y: number, w: number, h: number) {
  return {
    sx: (x - sim.camX) * sim.zoom + w / 2,
    sy: (sim.camY - y) * sim.zoom + h / 2,
  };
}

function visible(sim: Sim, x: number, y: number, w: number, h: number, pad = 30) {
  const p = w2s(sim, x, y, w, h);
  return p.sx > -pad && p.sy > -pad && p.sx < w + pad && p.sy < h + pad;
}

export function updateCamera(sim: Sim, dt: number, reduce: boolean) {
  const f = forward(sim.player.yaw);
  const nearLot = sim.player.y > sim.roadLength - 28;
  const lookX = sim.player.x + f.x * (nearLot ? 2.2 : 6.5);
  const lookY = sim.player.y + f.y * (nearLot ? 2.4 : 11);
  const k = 1 - Math.exp(-4 * dt);
  sim.camX += (lookX - sim.camX) * k;
  sim.camY += (lookY - sim.camY) * k;
  const z = nearLot ? 12.6 : 17.2;
  sim.zoom += (z - sim.zoom) * (1 - Math.exp(-2.4 * dt));
  const sh = reduce ? 0 : sim.trauma * sim.trauma;
  sim.shakeX = Math.sin(sim.time * 46) * 7 * sh;
  sim.shakeY = Math.cos(sim.time * 37) * 6 * sh;
}

export function drawWorld(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  ctx.fillStyle = FOREST;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.translate(sim.shakeX, sim.shakeY);

  drawForestFloor(ctx, sim, w, h);
  drawMountains(ctx, sim, w, h);
  drawWater(ctx, sim, w, h);
  drawShoulderAndRoad(ctx, sim, w, h);
  drawLot(ctx, sim, w, h);
  drawTrees(ctx, sim, w, h);
  drawBooth(ctx, sim, w, h);
  drawBodies(ctx, sim, w, h);
  for (const t of sim.traffic) {
    if (!visible(sim, t.x, t.y, w, h, 80)) continue;
    drawTraffic(ctx, sim, t, w, h);
  }
  for (const hunter of sim.hunters) drawHunter(ctx, sim, hunter, w, h);
  drawParked(ctx, sim, w, h);
  drawPlayer(ctx, sim, w, h);
  drawParticles(ctx, sim, w, h);
  drawPopups(ctx, sim, w, h);

  ctx.restore();
  const dawn = clamp(sim.clock / sim.gate, 0, 1);
  ctx.fillStyle = `rgba(10, 18, 32, ${0.16 * (1 - dawn)})`;
  ctx.fillRect(0, 0, w, h);
  const warm = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  warm.addColorStop(0, `rgba(227, 155, 115, ${0.05 + dawn * 0.22})`);
  warm.addColorStop(1, "rgba(227, 155, 115, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h * 0.5);
  if (sim.flash > 0) {
    ctx.fillStyle = `rgba(243, 239, 228, ${sim.flash * 2.2})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawForestFloor(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const zoom = sim.zoom;
  const y0 = Math.floor((sim.camY - h / zoom) / 16) * 16;
  const y1 = sim.camY + h / zoom;
  for (let y = y0; y < y1; y += 16) {
    for (let i = -6; i <= 6; i++) {
      const cx = roadCenterX(y, sim.lake);
      const x = cx + i * 14 + ((y * 3) % 7);
      if (!visible(sim, x, y, w, h, 40)) continue;
      const p = w2s(sim, x, y, w, h);
      ctx.fillStyle = i % 2 === 0 ? "#0e281f" : "#102c22";
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawMountains(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const baseY = sim.ay + 78;
  const peaks = sim.lake === "moraine" ? [-34, -18, -4, 8, 22, 36, 50] : [-28, -8, 10, 30, 48];
  const heights = sim.lake === "moraine" ? [34, 48, 40, 56, 44, 36, 28] : [30, 46, 38, 28, 22];
  peaks.forEach((off, i) => {
    const x = sim.ax + off;
    const peak = baseY + (heights[i] ?? 30);
    const a = w2s(sim, x - 16, baseY, w, h);
    const b = w2s(sim, x, peak, w, h);
    const c = w2s(sim, x + 16, baseY, w, h);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(c.sx, c.sy);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? "#1a3344" : "#24384a";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(b.sx, b.sy);
    ctx.lineTo(w2s(sim, x - 4.5, peak - (heights[i] ?? 30) * 0.28, w, h).sx, w2s(sim, x - 4.5, peak - (heights[i] ?? 30) * 0.28, w, h).sy);
    const snowL = w2s(sim, x - 4.5, peak - (heights[i] ?? 30) * 0.22, w, h);
    const snowR = w2s(sim, x + 4.5, peak - (heights[i] ?? 30) * 0.22, w, h);
    ctx.beginPath();
    ctx.moveTo(b.sx, b.sy);
    ctx.lineTo(snowL.sx, snowL.sy);
    ctx.lineTo(snowR.sx, snowR.sy);
    ctx.closePath();
    ctx.fillStyle = SNOW;
    ctx.fill();
  });
}

function drawWater(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const r = sim.water;
  pathRect(ctx, sim, r.x, r.y, r.w, r.h, w, h);
  const g = ctx.createLinearGradient(0, w2s(sim, 0, r.y + r.h, w, h).sy, 0, w2s(sim, 0, r.y, w, h).sy);
  g.addColorStop(0, "#0c6e74");
  g.addColorStop(0.5, "#14a8a4");
  g.addColorStop(1, "#1ec4bc");
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  pathRect(ctx, sim, r.x, r.y, r.w, r.h, w, h);
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    const y = r.y + 6 + i * 6 + Math.sin(sim.time * 1.4 + i) * 0.4;
    ctx.beginPath();
    const a = w2s(sim, r.x + 2, y, w, h);
    const b = w2s(sim, r.x + r.w - 2, y, w, h);
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.strokeStyle = `rgba(243, 239, 228, ${0.15 + 0.08 * Math.sin(sim.time + i)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  if (sim.lake === "louise") {
    const dock = { x: sim.ax - 30, y: r.y + 4, w: 10, h: 3.2 };
    pathRect(ctx, sim, dock.x, dock.y, dock.w, dock.h, w, h);
    ctx.fillStyle = "#6b543c";
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const p = w2s(sim, dock.x + 1.2 + i * 1.6, dock.y + 1.5, w, h);
      ctx.fillStyle = i % 2 ? DANGER : GLOW;
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 7, 3, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    const hotel = w2s(sim, sim.ax - 38, r.y + 14, w, h);
    ctx.fillStyle = "#243044";
    ctx.fillRect(hotel.sx, hotel.sy, 34, 18);
    ctx.fillStyle = PINE_LIT;
    ctx.beginPath();
    ctx.moveTo(hotel.sx - 4, hotel.sy);
    ctx.lineTo(hotel.sx + 17, hotel.sy - 14);
    ctx.lineTo(hotel.sx + 38, hotel.sy);
    ctx.fill();
  } else {
    for (let i = 0; i < 7; i++) {
      const p = w2s(sim, sim.ax - 18 + i * 5, r.y + 2 + (i % 3), w, h);
      ctx.fillStyle = i % 2 ? "#5c6b73" : "#7d8680";
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 10 + (i % 3) * 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawShoulderAndRoad(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const zoom = sim.zoom;
  const y0 = sim.camY - h / zoom / 2 - 24;
  const y1 = Math.min(sim.roadLength + 6, sim.camY + h / zoom / 2 + 24);
  strokeRibbon(ctx, sim, y0, y1, 1.35, SHOULDER, w, h);
  strokeRibbon(ctx, sim, y0, y1, 1, ASPHALT, w, h);

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(231, 226, 212, 0.75)";
  ctx.setLineDash([]);
  edgeLine(ctx, sim, y0, y1, -1, w, h);
  edgeLine(ctx, sim, y0, y1, 1, w, h);

  ctx.setLineDash([10, 14]);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(231, 226, 212, 0.45)";
  ctx.beginPath();
  let moved = false;
  for (let y = y0; y <= y1; y += 8) {
    const p = w2s(sim, roadCenterX(y, sim.lake), y, w, h);
    if (!moved) {
      ctx.moveTo(p.sx, p.sy);
      moved = true;
    } else ctx.lineTo(p.sx, p.sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

function strokeRibbon(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  y0: number,
  y1: number,
  scale: number,
  color: string,
  w: number,
  h: number,
) {
  ctx.beginPath();
  let started = false;
  for (let y = y0; y <= y1; y += 7) {
    const half = roadHalf(y, sim.roadLength, sim.roadWidth) * scale;
    const p = w2s(sim, roadCenterX(y, sim.lake) - half, y, w, h);
    if (!started) {
      ctx.moveTo(p.sx, p.sy);
      started = true;
    } else ctx.lineTo(p.sx, p.sy);
  }
  for (let y = y1; y >= y0; y -= 7) {
    const half = roadHalf(y, sim.roadLength, sim.roadWidth) * scale;
    const p = w2s(sim, roadCenterX(y, sim.lake) + half, y, w, h);
    ctx.lineTo(p.sx, p.sy);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function edgeLine(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  y0: number,
  y1: number,
  side: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  let started = false;
  for (let y = y0; y <= y1; y += 8) {
    const half = roadHalf(y, sim.roadLength, sim.roadWidth);
    const p = w2s(sim, roadCenterX(y, sim.lake) + side * half, y, w, h);
    if (!started) {
      ctx.moveTo(p.sx, p.sy);
      started = true;
    } else ctx.lineTo(p.sx, p.sy);
  }
  ctx.stroke();
}

function pathRect(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  x: number,
  y: number,
  rw: number,
  rh: number,
  w: number,
  h: number,
) {
  const a = w2s(sim, x, y, w, h);
  const b = w2s(sim, x + rw, y, w, h);
  const c = w2s(sim, x + rw, y + rh, w, h);
  const d = w2s(sim, x, y + rh, w, h);
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.lineTo(c.sx, c.sy);
  ctx.lineTo(d.sx, d.sy);
  ctx.closePath();
}

function drawLot(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const lot = sim.lot;
  pathRect(ctx, sim, lot.x, lot.y, lot.w, lot.h, w, h);
  ctx.fillStyle = "#313b44";
  ctx.fill();

  pathRect(ctx, sim, sim.fire.x, sim.fire.y, sim.fire.w, sim.fire.h, w, h);
  ctx.fillStyle = "#3a3030";
  ctx.fill();
  ctx.save();
  pathRect(ctx, sim, sim.fire.x, sim.fire.y, sim.fire.w, sim.fire.h, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(198, 69, 58, 0.8)";
  ctx.lineWidth = 2;
  const f0 = w2s(sim, sim.fire.x, sim.fire.y, w, h);
  for (let i = -8; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(f0.sx + i * 16, f0.sy + 40);
    ctx.lineTo(f0.sx + i * 16 + 28, f0.sy - 30);
    ctx.stroke();
  }
  ctx.restore();

  pathRect(ctx, sim, sim.bus.x, sim.bus.y, sim.bus.w, sim.bus.h, w, h);
  ctx.strokeStyle = "rgba(227, 155, 115, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  const busLabel = w2s(sim, sim.bus.x + sim.bus.w / 2, sim.bus.y + sim.bus.h / 2, w, h);
  ctx.fillStyle = GLOW;
  ctx.font = `600 ${Math.max(10, sim.zoom * 0.7)}px Outfit, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("BUS", busLabel.sx, busLabel.sy);

  for (const s of sim.stalls) drawStall(ctx, sim, s, w, h);
}

function drawStall(ctx: CanvasRenderingContext2D, sim: Sim, s: Stall, w: number, h: number) {
  pathRect(ctx, sim, s.x - s.w / 2, s.y - s.h / 2, s.w, s.h, w, h);
  const open = s.kind === "open" && s.claim === "none";
  const mine = s.claim === "player";
  if (open) {
    ctx.fillStyle = "rgba(26, 168, 164, 0.16)";
    ctx.fill();
  } else if (mine) {
    ctx.fillStyle = "rgba(26, 168, 164, 0.4)";
    ctx.fill();
  } else if (s.kind === "decoy") {
    ctx.fillStyle = "rgba(227, 155, 115, 0.08)";
    ctx.fill();
  }
  ctx.strokeStyle = s.kind === "accessible" ? GLOW : open || mine ? GLACIER : "rgba(231,226,212,0.55)";
  ctx.lineWidth = mine ? 3 : 1.5;
  ctx.setLineDash(s.kind === "decoy" ? [4, 4] : []);
  ctx.stroke();
  ctx.setLineDash([]);

  if (s.kind === "accessible") {
    const p = w2s(sim, s.x, s.y, w, h);
    ctx.strokeStyle = GLOW;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy - 2, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.sx + 1, p.sy + 6, 7, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
  }
  if (s.kind === "decoy") {
    const p = w2s(sim, s.x, s.y, w, h);
    ctx.strokeStyle = GLOW;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.sx - 6, p.sy + 6);
    ctx.lineTo(p.sx - 6, p.sy - 4);
    ctx.lineTo(p.sx + 5, p.sy - 4);
    ctx.stroke();
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  for (const tree of sim.trees) {
    if (!visible(sim, tree.x, tree.y, w, h, 20)) continue;
    const p = w2s(sim, tree.x, tree.y, w, h);
    const s = tree.s * sim.zoom * 0.55;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(p.sx + 2, p.sy + 2, s * 0.45, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = tree.snow ? "#245445" : PINE;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy - s);
    ctx.lineTo(p.sx + s * 0.48, p.sy + s * 0.15);
    ctx.lineTo(p.sx - s * 0.48, p.sy + s * 0.15);
    ctx.fill();
    ctx.fillStyle = tree.snow ? "#d5dece" : PINE_LIT;
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy - s * 0.72);
    ctx.lineTo(p.sx + s * 0.28, p.sy - s * 0.15);
    ctx.lineTo(p.sx - s * 0.28, p.sy - s * 0.15);
    ctx.fill();
  }
}

function drawBooth(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const y = sim.boothY;
  const cx = roadCenterX(y, sim.lake);
  const half = roadHalf(y, sim.roadLength, sim.roadWidth);
  const kiosk = w2s(sim, cx - half - 1.6, y, w, h);
  ctx.fillStyle = "#243244";
  ctx.fillRect(kiosk.sx - 8, kiosk.sy - 14, 18, 22);
  ctx.fillStyle = GLACIER;
  ctx.fillRect(kiosk.sx - 6, kiosk.sy - 8, 10, 6);
  const sign = w2s(sim, cx, y - 18, w, h);
  ctx.fillStyle = "rgba(16,32,51,0.82)";
  ctx.fillRect(sign.sx - 46, sign.sy - 12, 92, 20);
  ctx.fillStyle = SNOW;
  ctx.font = "600 11px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PARK PASS", sign.sx, sign.sy + 3);

  const pass = sim.bodies.find((b) => b.kind === "pass");
  if (pass && !pass.taken) {
    const arrow = w2s(sim, pass.x, pass.y + 6, w, h);
    ctx.fillStyle = GLACIER;
    ctx.font = "600 11px Outfit, sans-serif";
    ctx.fillText("PASS", arrow.sx, arrow.sy);
  }
}

function drawBodies(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  for (const b of sim.bodies) {
    if (b.taken) continue;
    if (!visible(sim, b.x, b.y, w, h, 30)) continue;
    const p = w2s(sim, b.x, b.y, w, h);
    if (b.kind === "elk" || b.kind === "bear" || b.kind === "sheep") drawAnimal(ctx, p.sx, p.sy, sim.zoom, b);
    else if (b.kind === "rock") {
      ctx.fillStyle = "#6d756f";
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, b.r * sim.zoom, b.r * sim.zoom * 0.72, 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === "photographer") {
      ctx.strokeStyle = SNOW;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy + 8);
      ctx.lineTo(p.sx, p.sy - 6);
      ctx.moveTo(p.sx - 6, p.sy + 10);
      ctx.lineTo(p.sx, p.sy);
      ctx.lineTo(p.sx + 6, p.sy + 10);
      ctx.stroke();
      ctx.fillStyle = HEAD;
      ctx.beginPath();
      ctx.arc(p.sx + 8, p.sy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === "pass") {
      const bob = Math.sin(sim.time * 3) * 3;
      ctx.fillStyle = GLACIER;
      ctx.fillRect(p.sx - 7, p.sy - 9 + bob, 14, 16);
      ctx.fillStyle = NIGHT;
      ctx.fillRect(p.sx - 4, p.sy - 5 + bob, 8, 6);
    } else if (b.kind === "coffee") {
      const bob = Math.sin(sim.time * 3 + 1) * 3;
      ctx.fillStyle = SNOW;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GLOW;
      ctx.fillRect(p.sx - 3, p.sy - 8 + bob, 6, 5);
    } else if (b.kind === "chair") {
      ctx.strokeStyle = GLOW;
      ctx.lineWidth = 2;
      ctx.strokeRect(p.sx - 6, p.sy - 4, 12, 10);
    }
  }
}

function drawAnimal(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  zoom: number,
  b: Body,
) {
  const k = zoom * 0.42;
  ctx.save();
  ctx.translate(sx, sy);
  if (b.kind === "elk") {
    ctx.fillStyle = "#6a4a32";
    ctx.beginPath();
    ctx.ellipse(0, 2, 11 * (k / 7), 5 * (k / 7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-8 * (k / 7), -2, 4 * (k / 7), 3.2 * (k / 7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d9c7a4";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-10 * (k / 7), -4);
    ctx.lineTo(-14 * (k / 7), -10);
    ctx.moveTo(-8 * (k / 7), -5);
    ctx.lineTo(-6 * (k / 7), -12);
    ctx.stroke();
  } else if (b.kind === "bear") {
    ctx.fillStyle = "#241c18";
    ctx.beginPath();
    ctx.ellipse(0, 2, 12 * (k / 7), 7 * (k / 7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-8 * (k / 7), -2, 4.2 * (k / 7), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#efe8dc";
    ctx.beginPath();
    ctx.ellipse(0, 2, 8 * (k / 7), 4.5 * (k / 7), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-6 * (k / 7), 0, 3 * (k / 7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTraffic(ctx: CanvasRenderingContext2D, sim: Sim, t: Traffic, w: number, h: number) {
  const spec =
    t.kind === "bus"
      ? { len: 10.5, wid: 2.7, body: "#d9d3c6", roof: "#1aa8a4" }
      : t.kind === "rv"
        ? { len: 7.4, wid: 2.35, body: "#efeae0", roof: "#1e4d3c" }
        : t.kind === "shuttle"
          ? { len: 6.4, wid: 2.25, body: "#14352c", roof: "#1aa8a4" }
          : { len: 4.3, wid: 1.75, body: "#d7dde0", roof: "#2a333b" };
  drawRig(ctx, sim, t.x, t.y, t.yaw, spec.len, spec.wid, spec.body, spec.roof, w, h, false, true);
}

function drawHunter(ctx: CanvasRenderingContext2D, sim: Sim, hunter: Hunter, w: number, h: number) {
  if (hunter.phase === "parked") return;
  const bodies = ["#e7e2d4", "#c96a4a", "#2a3340"];
  const body = bodies[hunter.hue] ?? SNOW;
  drawRig(ctx, sim, hunter.x, hunter.y, hunter.yaw, 4.2, 1.75, body, "#1a2430", w, h, hunter.hesitate > 0, true);
}

function drawParked(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  for (const s of sim.stalls) {
    if (s.claim !== "static" && s.claim !== "ai") continue;
    const yaw = s.claim === "ai" ? sim.hunters.find((hun) => hun.stallId === s.id && hun.phase === "parked")?.yaw ?? parkedYawFor(s.row) : parkedYawFor(s.row);
    drawRig(ctx, sim, s.x, s.y, yaw, 4.15, 1.72, s.claim === "ai" ? "#d5dbdf" : "#c5ccd0", "#243040", w, h, false, false);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  const p = w2s(sim, sim.player.x, sim.player.y, w, h);
  ctx.strokeStyle = GLACIER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, sim.zoom * 1.25, 0, Math.PI * 2);
  ctx.stroke();
  drawRig(
    ctx,
    sim,
    sim.player.x,
    sim.player.y,
    sim.player.yaw,
    4.45,
    1.86,
    "#1b4a3c",
    "#f3efe4",
    w,
    h,
    sim.brakeLight > 0.2,
    true,
    true,
  );
}

function drawRig(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  x: number,
  y: number,
  yaw: number,
  length: number,
  width: number,
  body: string,
  roof: string,
  w: number,
  h: number,
  brakes: boolean,
  lights: boolean,
  roofBox = false,
) {
  if (!visible(sim, x, y, w, h, 60)) return;
  const p = w2s(sim, x, y, w, h);
  const dawn = clamp(sim.clock / Math.max(1, sim.gate), 0, 1);
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.rotate(-yaw);
  ctx.scale(sim.zoom, sim.zoom);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(0.12, 0.18, width * 0.55, length * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  if (lights && dawn < 0.85) {
    const a = 0.22 * (1 - dawn * 0.7);
    const grd = ctx.createLinearGradient(0, -length / 2, 0, -length / 2 - 8);
    grd.addColorStop(0, `rgba(255, 231, 168, ${a})`);
    grd.addColorStop(1, "rgba(255, 231, 168, 0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(-0.35, -length / 2);
    ctx.lineTo(2.6, -length / 2 - 8.5);
    ctx.lineTo(-2.6, -length / 2 - 8.5);
    ctx.fill();
  }
  round(ctx, -width / 2, -length / 2, width, length, 0.35);
  ctx.fillStyle = body;
  ctx.fill();
  round(ctx, -width * 0.38, -length * 0.18, width * 0.76, length * 0.42, 0.2);
  ctx.fillStyle = roof;
  ctx.fill();
  ctx.fillStyle = "rgba(180, 210, 214, 0.55)";
  ctx.fillRect(-width * 0.32, -length * 0.28, width * 0.64, length * 0.12);
  if (roofBox) {
    ctx.fillStyle = "#c2b49a";
    round(ctx, -width * 0.28, -length * 0.08, width * 0.56, length * 0.28, 0.08);
    ctx.fill();
  }
  if (lights) {
    ctx.fillStyle = HEAD;
    ctx.fillRect(-width * 0.38, -length / 2 + 0.08, 0.38, 0.28);
    ctx.fillRect(width * 0.38 - 0.38, -length / 2 + 0.08, 0.38, 0.28);
  }
  ctx.fillStyle = brakes ? DANGER : "#4a2424";
  ctx.fillRect(-width * 0.38, length / 2 - 0.36, 0.36, 0.24);
  ctx.fillRect(width * 0.38 - 0.36, length / 2 - 0.36, 0.36, 0.24);
  ctx.restore();
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, rw, rh, r);
}

function drawParticles(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  for (const particle of sim.particles) {
    const p = w2s(sim, particle.x, particle.y, w, h);
    const a = Math.max(0, particle.life / particle.max);
    ctx.globalAlpha = a;
    ctx.fillStyle = particle.kind === "glow" ? GLACIER : particle.kind === "spark" ? GLOW : SNOW;
    ctx.fillRect(p.sx, p.sy, 3, 3);
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number) {
  ctx.textAlign = "center";
  ctx.font = "700 13px Outfit, sans-serif";
  for (const pop of sim.popups) {
    const p = w2s(sim, pop.x, pop.y, w, h);
    ctx.globalAlpha = Math.max(0, pop.life / pop.max);
    ctx.fillStyle = SNOW;
    ctx.fillText(pop.text, p.sx, p.sy);
  }
  ctx.globalAlpha = 1;
}
