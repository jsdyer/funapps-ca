import {
  AISLE,
  GRAVEL,
  ROAD,
  STALL_H,
  STALL_W,
  WALLS,
  makeStalls,
  type Car,
  type Sim,
  type Stall,
} from "./logic";

const WORLD = { minX: -42, minY: -28, maxX: 42, maxY: 48 };
const SCALE = 14;

let ground: HTMLCanvasElement | null = null;
let reduceMotion = false;

function hash(ix: number, iy: number) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function ensureGround() {
  if (ground) return ground;
  const w = Math.ceil((WORLD.maxX - WORLD.minX) * SCALE);
  const h = Math.ceil((WORLD.maxY - WORLD.minY) * SCALE);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.setTransform(SCALE, 0, 0, SCALE, -WORLD.minX * SCALE, -WORLD.minY * SCALE);
  paintGround(g);
  ground = canvas;
  return canvas;
}

function paintGround(g: CanvasRenderingContext2D) {
  g.fillStyle = "#6d9a58";
  g.fillRect(WORLD.minX, WORLD.minY, WORLD.maxX - WORLD.minX, WORLD.maxY - WORLD.minY);

  const sea = g.createLinearGradient(0, -28, 0, -9);
  sea.addColorStop(0, "#0e3e52");
  sea.addColorStop(0.55, "#1a6d88");
  sea.addColorStop(1, "#3d8ea3");
  g.fillStyle = sea;
  g.fillRect(WORLD.minX, -28, WORLD.maxX - WORLD.minX, 19);

  g.fillStyle = "#e6c89a";
  g.fillRect(WORLD.minX, -10.2, WORLD.maxX - WORLD.minX, 4.4);
  g.fillStyle = "#c9a678";
  g.fillRect(WORLD.minX, -10.2, WORLD.maxX - WORLD.minX, 0.7);

  for (let i = 0; i < 18; i++) {
    const x = -30 + i * 3.4;
    g.fillStyle = i % 2 ? "#d7b588" : "#efd7ae";
    g.beginPath();
    g.ellipse(x, -7.2, 2.4, 0.7, 0.2, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "#6f9a55";
  g.fillRect(WORLD.minX, -6, WORLD.maxX - WORLD.minX, 54);
  for (let i = 0; i < 48; i++) {
    const n = hash(i, 2);
    const m = hash(i, 8);
    const x = -34 + (i * 1.7) % 68;
    const y = -2 + n * 44;
    g.fillStyle = n > 0.6 ? "rgba(86, 122, 58, 0.45)" : "rgba(214, 186, 122, 0.28)";
    g.beginPath();
    g.ellipse(x, y, 3.2 + m * 2.4, 1.1 + n, n * 3, 0, Math.PI * 2);
    g.fill();
  }

  // Lupins along the lane — June on the Island.
  for (let i = 0; i < 46; i++) {
    const n = hash(i, 9);
    const x = -7.8 + (i % 2 === 0 ? -1 : 1) * (6.8 + n * 4);
    const y = 15 + i * 0.45;
    g.fillStyle = n > 0.66 ? "#c44b78" : n > 0.33 ? "#8d4fa8" : "#e07aa4";
    g.beginPath();
    g.ellipse(x, y, 0.18, 0.28, 0, 0, Math.PI * 2);
    g.fill();
  }

  roundRect(g, GRAVEL.x - GRAVEL.w / 2, GRAVEL.y - GRAVEL.h / 2, GRAVEL.w, GRAVEL.h, 0.6);
  g.fillStyle = "#b7aa96";
  g.fill();
  for (let i = 0; i < 420; i++) {
    const n = hash(i, 3);
    const m = hash(i, 4);
    g.fillStyle = n > 0.5 ? "rgba(90,78,62,0.28)" : "rgba(255,248,236,0.22)";
    g.fillRect(GRAVEL.x - GRAVEL.w / 2 + m * GRAVEL.w, GRAVEL.y - GRAVEL.h / 2 + n * GRAVEL.h, 0.12, 0.12);
  }

  g.fillStyle = "#4a4f55";
  g.fillRect(ROAD.x - ROAD.w / 2, ROAD.y - ROAD.h / 2, ROAD.w, ROAD.h);
  g.fillRect(AISLE.x - 3.3, AISLE.y - 0.2, 6.6, AISLE.h / 2 + 0.6);

  // Shoulders — the famous no-parking.
  g.save();
  g.beginPath();
  g.rect(-6.5, 14.2, 3.2, 22);
  g.rect(3.3, 14.2, 3.2, 22);
  g.clip();
  g.fillStyle = "#cbb892";
  g.fillRect(-6.5, 14.2, 9.8, 22);
  g.strokeStyle = "rgba(197,54,43,0.85)";
  g.lineWidth = 0.12;
  for (let y = 14.4; y < 36; y += 0.7) {
    g.beginPath();
    g.moveTo(-6.4, y);
    g.lineTo(-3.4, y + 0.45);
    g.moveTo(3.4, y);
    g.lineTo(6.4, y + 0.45);
    g.stroke();
  }
  g.restore();

  g.fillStyle = "#f4f1ea";
  g.font = "0.62px Outfit, sans-serif";
  g.textAlign = "center";
  g.save();
  g.translate(-5.1, 22);
  g.rotate(-Math.PI / 2);
  g.fillText("NO PARKING", 0, 0);
  g.restore();
  g.save();
  g.translate(5.1, 22);
  g.rotate(Math.PI / 2);
  g.fillText("NO PARKING", 0, 0);
  g.restore();

  // Crosswalk.
  g.fillStyle = "#f4f1ea";
  for (let i = 0; i < 5; i++) {
    g.fillRect(-2.6 + i * 1.15, 17.6, 0.7, 0.28);
  }

  g.strokeStyle = "rgba(247,244,238,0.7)";
  g.lineWidth = 0.08;
  g.setLineDash([0.55, 0.45]);
  g.beginPath();
  g.moveTo(0, 16);
  g.lineTo(0, 35.5);
  g.stroke();
  g.setLineDash([]);

  const stalls = makeStalls();
  g.strokeStyle = "rgba(247,244,238,0.95)";
  g.lineWidth = 0.16;
  for (const s of stalls) {
    g.strokeRect(s.x - STALL_W / 2, s.y - STALL_H / 2, STALL_W, STALL_H);
  }

  g.strokeStyle = "#8d8374";
  g.lineWidth = 0.16;
  for (const w of WALLS) {
    g.strokeRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
    g.fillStyle = "#9a9184";
    g.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
  }

  // Fence along the beach.
  g.strokeStyle = "#efe6d2";
  g.lineWidth = 0.08;
  g.beginPath();
  g.moveTo(-34, -6.4);
  g.lineTo(34, -6.4);
  g.stroke();
  for (let x = -34; x <= 34; x += 1.3) {
    g.fillStyle = "#f7f4ee";
    g.fillRect(x, -6.7, 0.08, 0.6);
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function drawCar(ctx: CanvasRenderingContext2D, c: Car, dusk: number) {
  ctx.save();
  ctx.translate(c.x + 0.12, c.y + 0.16);
  ctx.fillStyle = "rgba(20,22,26,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 0, c.w * 0.55, c.h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(-c.yaw);
  const hw = c.w / 2;
  const hl = c.h / 2;
  ctx.fillStyle = "#1c1915";
  const wheel = (x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(c.roll * 1.4) * 0.04);
    ctx.fillRect(-0.18, -0.32, 0.36, 0.64);
    ctx.restore();
  };
  wheel(-hw + 0.08, -hl + 0.7);
  wheel(hw - 0.08, -hl + 0.7);
  wheel(-hw + 0.08, hl - 0.7);
  wheel(hw - 0.08, hl - 0.7);

  roundRect(ctx, -hw + 0.12, -hl, c.w - 0.24, c.h, 0.35);
  ctx.fillStyle = c.color;
  ctx.fill();
  ctx.lineWidth = 0.07;
  ctx.strokeStyle = "rgba(20,16,12,0.65)";
  ctx.stroke();
  ctx.fillStyle = c.roof;
  roundRect(ctx, -hw + 0.38, -hl + c.h * 0.28, c.w - 0.76, c.h * 0.4, 0.25);
  ctx.fill();
  ctx.fillStyle = c.glass;
  ctx.fillRect(-hw + 0.32, -hl + 0.35, c.w - 0.64, c.h * 0.16);
  ctx.fillStyle = dusk > 0.25 ? "#f2e2b0" : "#f7f4ee";
  ctx.fillRect(-hw + 0.28, -hl + 0.08, 0.28, 0.18);
  ctx.fillRect(hw - 0.56, -hl + 0.08, 0.28, 0.18);
  if (c.speed < -0.2 || c.label === "your rental") {
    ctx.fillStyle = "#c5362b";
    ctx.fillRect(-hw + 0.3, hl - 0.28, 0.28, 0.16);
    ctx.fillRect(hw - 0.58, hl - 0.28, 0.28, 0.16);
  }
  ctx.restore();

  if (dusk > 0.35 && c.speed > 0.4) {
    const f = { x: -Math.sin(c.yaw), y: -Math.cos(c.yaw) };
    const rx = Math.cos(c.yaw);
    const ry = -Math.sin(c.yaw);
    ctx.fillStyle = `rgba(242, 214, 150, ${0.08 + dusk * 0.08})`;
    for (const side of [-1, 1]) {
      const hx = c.x + f.x * (c.h / 2) + rx * side * (c.w * 0.28);
      const hy = c.y + f.y * (c.h / 2) + ry * side * (c.w * 0.28);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + f.x * 2.4 + rx * side * 0.35, hy + f.y * 2.4 + ry * side * 0.35);
      ctx.lineTo(hx + f.x * 2.4 - rx * side * 0.15, hy + f.y * 2.4 - ry * side * 0.15);
      ctx.fill();
    }
  }
}

function drawPed(ctx: CanvasRenderingContext2D, x: number, y: number, shirt: string, hat: string, scared: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(20,22,26,0.25)";
  ctx.beginPath();
  ctx.ellipse(0.08, 0.12, 0.28, 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(0, 0.05, 0.22, 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0d2be";
  ctx.beginPath();
  ctx.arc(0, -0.22, 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.ellipse(0, -0.3, 0.2, 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  if (scared > 0) {
    ctx.fillStyle = "#f3ecdf";
    ctx.fillRect(-0.05, -0.55, 0.1, 0.18);
  }
  ctx.restore();
}

function drawLighthouse(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number, dusk: number) {
  const h = 6.4 * s;
  const w = 2.15 * s;
  ctx.save();
  ctx.fillStyle = "rgba(20,24,28,0.25)";
  ctx.beginPath();
  ctx.ellipse(sx + s * 0.2, sy + 2, w * 0.9, w * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.62, sy);
  ctx.lineTo(sx + w * 0.62, sy);
  ctx.lineTo(sx + w * 0.4, sy - h);
  ctx.lineTo(sx - w * 0.4, sy - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#e4d8c6";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#8e241c";
  ctx.fillRect(sx - w * 0.12, sy - h * 0.2, w * 0.24, h * 0.2);
  ctx.fillStyle = "#9ec9d6";
  ctx.fillRect(sx - w * 0.1, sy - h * 0.48, w * 0.2, h * 0.1);
  ctx.fillRect(sx - w * 0.1, sy - h * 0.68, w * 0.2, h * 0.1);
  ctx.fillStyle = "#c5362b";
  ctx.fillRect(sx - w * 0.7, sy - h - 3, w * 1.4, 4);
  const room = h * 0.14;
  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(sx - w * 0.28, sy - h - 3 - room, w * 0.56, room);
  const glow = 0.25 + dusk * 0.7;
  ctx.fillStyle = `rgba(231, 163, 35, ${glow})`;
  ctx.fillRect(sx - w * 0.18, sy - h - 1 - room, w * 0.36, room * 0.7);
  ctx.fillStyle = "#c5362b";
  ctx.beginPath();
  ctx.arc(sx, sy - h - 3 - room, w * 0.3, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(sx - 1, sy - h - 3 - room - w * 0.45, 2, w * 0.2);
  if (dusk > 0.15) {
    const ly = sy - h - room;
    const rad = (30 + dusk * 50) * (s / 18);
    const grd = ctx.createRadialGradient(sx, ly, 2, sx, ly, rad);
    grd.addColorStop(0, `rgba(231,163,35,${0.45 * dusk})`);
    grd.addColorStop(1, "rgba(231,163,35,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, ly, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCottage(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number) {
  const w = 4.2 * s;
  const h = 2.6 * s;
  ctx.save();
  ctx.fillStyle = "rgba(20,24,28,0.22)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, w * 0.46, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(sx - w / 2, sy - h, w, h);
  ctx.fillStyle = "#c5362b";
  ctx.beginPath();
  ctx.moveTo(sx - w * 0.62, sy - h);
  ctx.lineTo(sx, sy - h - h * 0.55);
  ctx.lineTo(sx + w * 0.62, sy - h);
  ctx.fill();
  ctx.fillStyle = "#9ec9d6";
  ctx.fillRect(sx - w * 0.32, sy - h * 0.62, w * 0.16, h * 0.28);
  ctx.fillRect(sx + w * 0.12, sy - h * 0.62, w * 0.16, h * 0.28);
  ctx.fillStyle = "#8e241c";
  ctx.fillRect(sx - w * 0.08, sy - h * 0.42, w * 0.16, h * 0.42);
  ctx.restore();
}

function drawSign(ctx: CanvasRenderingContext2D, sx: number, sy: number, s: number) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(-2, -s * 1.4, 4, s * 1.4);
  ctx.fillStyle = "#f3ecdf";
  ctx.fillRect(-s * 1.15, -s * 2.15, s * 2.3, s * 0.85);
  ctx.strokeStyle = "#c5362b";
  ctx.lineWidth = 2;
  ctx.strokeRect(-s * 1.15, -s * 2.15, s * 2.3, s * 0.85);
  ctx.fillStyle = "#c5362b";
  ctx.font = `600 ${Math.max(10, s * 0.32)}px Outfit, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CLOSES AT DUSK", 0, -s * 1.72);
  ctx.restore();
}

function npcBlocking(sim: Sim, stall: Stall) {
  return sim.cars.some((c) => Math.abs(c.x - stall.x) <= STALL_W / 2 && Math.abs(c.y - stall.y) <= STALL_H / 2);
}

export function draw(canvas: HTMLCanvasElement, sim: Sim) {
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (cssW < 2 || cssH < 2) return;
  if (typeof window !== "undefined" && window.matchMedia) {
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const viewW = cssW < 720 ? 30 : 40;
  const viewH = cssW < 720 ? 44 : 28;
  const zoom = Math.min(cssW / viewW, cssH / viewH);
  const dusk =
    sim.phase === "menu" ? 0.18 : Math.max(0.08, Math.min(0.85, (sim.time / Math.max(1, sim.limit)) * 0.9));
  const shake = reduceMotion ? 0 : sim.shake;
  const ox = Math.sin(sim.clock * 42) * shake * 7;
  const oy = Math.cos(sim.clock * 35) * shake * 6;

  const toScreen = (x: number, y: number) => ({
    x: (x - sim.camX) * zoom + cssW / 2 + ox,
    y: (y - sim.camY) * zoom + cssH / 2 + oy,
  });

  ctx.save();
  ctx.translate(cssW / 2 + ox, cssH / 2 + oy);
  ctx.scale(zoom, zoom);
  ctx.translate(-sim.camX, -sim.camY);

  const bg = ensureGround();
  ctx.drawImage(bg, WORLD.minX, WORLD.minY, WORLD.maxX - WORLD.minX, WORLD.maxY - WORLD.minY);

  // Animated water sheen.
  if (!reduceMotion) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(WORLD.minX, -28, WORLD.maxX - WORLD.minX, 18.5);
    ctx.clip();
    ctx.strokeStyle = "rgba(247,244,238,0.18)";
    ctx.lineWidth = 0.08;
    for (let i = 0; i < 6; i++) {
      const y = -20 + i * 1.7 + Math.sin(sim.clock * 0.8 + i) * 0.25;
      ctx.beginPath();
      for (let x = -40; x <= 40; x += 2) {
        const yy = y + Math.sin(sim.clock * 1.3 + x * 0.4 + i) * 0.12;
        if (x === -40) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(sim.clock * 3.2));
  for (const stall of sim.stalls) {
    if (npcBlocking(sim, stall)) continue;
    ctx.fillStyle = `rgba(231, 163, 35, ${0.16 + pulse * 0.12})`;
    ctx.strokeStyle = `rgba(231, 163, 35, ${0.75 + pulse * 0.25})`;
    ctx.lineWidth = 0.14;
    ctx.fillRect(stall.x - STALL_W / 2, stall.y - STALL_H / 2, STALL_W, STALL_H);
    ctx.strokeRect(stall.x - STALL_W / 2, stall.y - STALL_H / 2, STALL_W, STALL_H);
  }

  for (const skid of sim.skids) {
    ctx.fillStyle = `rgba(30,30,32,${0.28 * (skid.life / 1.6)})`;
    ctx.beginPath();
    ctx.ellipse(skid.x, skid.y, 0.16, 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const particle of sim.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.tone;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const order = [...sim.cars].sort((a, b) => a.y - b.y);
  for (const car of order) drawCar(ctx, car, dusk);
  for (const ped of sim.peds) drawPed(ctx, ped.x, ped.y, ped.shirt, ped.hat, ped.scared);
  drawCar(ctx, sim.player, dusk);

  if (sim.parkHold > 0 && sim.phase === "play") {
    ctx.strokeStyle = "rgba(243,236,223,0.9)";
    ctx.lineWidth = 0.12;
    ctx.beginPath();
    ctx.arc(sim.player.x, sim.player.y, 1.55, -Math.PI / 2, -Math.PI / 2 + sim.parkHold * Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = `rgba(16, 24, 36, ${dusk * 0.2})`;
  ctx.fillRect(WORLD.minX, WORLD.minY, WORLD.maxX - WORLD.minX, WORLD.maxY - WORLD.minY);
  ctx.restore();

  const light = toScreen(-21.2, -6.2);
  drawLighthouse(ctx, light.x, light.y, zoom, dusk);
  const cot = toScreen(-21.4, 2.2);
  drawCottage(ctx, cot.x, cot.y, zoom);
  const sign = toScreen(8.4, 16.2);
  if (sign.x > -80 && sign.x < cssW + 80 && sign.y > -40 && sign.y < cssH + 40) {
    drawSign(ctx, sign.x, sign.y, zoom);
  }

  ctx.save();
  ctx.font = "600 13px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  for (const c of sim.callouts) {
    const p = toScreen(c.x, c.y);
    ctx.globalAlpha = Math.max(0, Math.min(1, c.life));
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#14202b";
    ctx.strokeText(c.text, p.x, p.y);
    ctx.fillStyle = "#f3ecdf";
    ctx.fillText(c.text, p.x, p.y);
  }
  ctx.restore();

  if (sim.phase === "play") {
    for (const stall of sim.stalls) {
      if (npcBlocking(sim, stall)) continue;
      const p = toScreen(stall.x, stall.y);
      const m = 28;
      if (p.x > m && p.x < cssW - m && p.y > m && p.y < cssH - m) continue;
      const cx = Math.max(m, Math.min(cssW - m, p.x));
      const cy = Math.max(m + 70, Math.min(cssH - m, p.y));
      const ang = Math.atan2(p.y - cy, p.x - cx);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.fillStyle = "#e7a323";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, 6);
      ctx.lineTo(-6, -6);
      ctx.fill();
      ctx.restore();
    }
  }

  if (!reduceMotion) {
    ctx.strokeStyle = "rgba(28,25,21,0.75)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 210 + sim.clock * (18 + i * 4)) % (cssW + 120)) - 60;
      const y = 36 + (i % 3) * 22 + Math.sin(sim.clock * 1.2 + i) * 8;
      const wing = Math.sin(sim.clock * 7 + i) * 7;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + wing);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 8, y - wing);
      ctx.stroke();
    }
  }

  const vg = ctx.createRadialGradient(cssW / 2, cssH / 2, cssW * 0.2, cssW / 2, cssH / 2, cssW * 0.72);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, `rgba(12, 10, 8, ${0.28 + sim.stress * 0.0025})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, cssW, cssH);
}
