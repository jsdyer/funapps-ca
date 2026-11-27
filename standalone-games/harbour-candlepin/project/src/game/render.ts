import {
  ARROW_Z,
  BALL_R,
  BALL_Z,
  HEAD_Z,
  LANE_HALF,
  PIN_LAYOUT,
  predictPath,
  type Pin,
  type World,
} from "./physics";

export type View = {
  w: number;
  h: number;
  time: number;
  stance: number;
  target: number;
  power: number;
  spin: number;
  guide: boolean;
  shake: boolean;
  showMarks: boolean;
  showLeave: boolean;
  setter: number;
  attract: boolean;
  reduceMotion: boolean;
  pull: { nx: number; ny: number; power: number } | null;
};

type Proj = { x: number; y: number; scale: number; t: number; half: number };

const Z_NEAR = -70;
const Z_FAR = 830;
/** Telephoto on the pin deck so four rows don't collapse into one speck. */
const TELE_A = 0.872;
const TELE_B = 0.918;
const TELE_T0 = 0.4;
const TELE_T1 = 0.82;

function camera(h: number): { vanishY: number; nearY: number } {
  return { vanishY: h * 0.18, nearY: h * 0.94 };
}

function laneWidths(w: number, h: number): { nearHalf: number; farHalf: number } {
  return {
    nearHalf: Math.min(w * 0.46, h * 0.9, 520),
    farHalf: Math.min(w * 0.3, Math.max(h * 0.24, 130)),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function depthT(z: number): number {
  const u = clamp01((z - Z_NEAR) / (Z_FAR - Z_NEAR));
  if (u <= TELE_A) return (u / TELE_A) * TELE_T0;
  if (u >= TELE_B) return TELE_T1 + ((u - TELE_B) / (1 - TELE_B)) * (1 - TELE_T1);
  return TELE_T0 + ((u - TELE_A) / (TELE_B - TELE_A)) * (TELE_T1 - TELE_T0);
}

function zFromT(t: number): number {
  const tc = clamp01(t);
  let u: number;
  if (tc <= TELE_T0) u = (tc / TELE_T0) * TELE_A;
  else if (tc >= TELE_T1) u = TELE_B + ((tc - TELE_T1) / (1 - TELE_T1)) * (1 - TELE_B);
  else u = TELE_A + ((tc - TELE_T0) / (TELE_T1 - TELE_T0)) * (TELE_B - TELE_A);
  return Z_NEAR + u * (Z_FAR - Z_NEAR);
}

export function project(x: number, z: number, w: number, h: number): Proj {
  const t = depthT(z);
  const { vanishY, nearY } = camera(h);
  const y = nearY + (vanishY - nearY) * t;
  const { nearHalf, farHalf } = laneWidths(w, h);
  const half = nearHalf + (farHalf - nearHalf) * t;
  return {
    x: w * 0.5 + (x / LANE_HALF) * half,
    y,
    scale: half / LANE_HALF,
    t,
    half,
  };
}

export function unproject(
  sx: number,
  sy: number,
  w: number,
  h: number,
): { x: number; z: number } | null {
  const { vanishY, nearY } = camera(h);
  const t = (sy - nearY) / (vanishY - nearY);
  if (t < -0.08 || t > 1.08) return null;
  const tc = clamp01(t);
  const { nearHalf, farHalf } = laneWidths(w, h);
  const half = nearHalf + (farHalf - nearHalf) * tc;
  const x = ((sx - w * 0.5) / half) * LANE_HALF;
  return { x, z: zFromT(tc) };
}

function boardShade(i: number): string {
  const n = Math.sin(i * 12.9898) * 43758.5453;
  const f = n - Math.floor(n);
  const light = i % 2 === 0 ? 196 : 176;
  const g = light - Math.floor(f * 18);
  const r = g + 28;
  const b = Math.floor(g * 0.55);
  return `rgb(${r}, ${g}, ${b})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRoom(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0c1828");
  sky.addColorStop(0.22, "#1c334c");
  sky.addColorStop(1, "#122033");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const wallTop = h * 0.0;
  const wallBot = h * 0.3;
  ctx.fillStyle = "#1a2c3f";
  ctx.fillRect(0, wallTop, w, wallBot - wallTop);

  const winX = w * 0.18;
  const winY = h * 0.025;
  const winW = w * 0.64;
  const winH = h * 0.145;
  const dusk = ctx.createLinearGradient(0, winY, 0, winY + winH);
  dusk.addColorStop(0, "#1a3d66");
  dusk.addColorStop(0.45, "#c46b58");
  dusk.addColorStop(0.72, "#f0c39a");
  dusk.addColorStop(1, "#8ea4b5");
  ctx.fillStyle = dusk;
  ctx.fillRect(winX, winY, winW, winH);

  const waterY = winY + winH * 0.62;
  ctx.fillStyle = "#1a3348";
  ctx.fillRect(winX, waterY, winW, winY + winH - waterY);
  ctx.fillStyle = "rgba(240, 195, 154, 0.28)";
  ctx.fillRect(winX, waterY, winW, Math.max(2, h * 0.006));

  ctx.fillStyle = "#243246";
  const islandX = winX + winW * 0.42;
  ctx.beginPath();
  ctx.ellipse(islandX, waterY + 2, winW * 0.07, winH * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(islandX - winW * 0.012, waterY - winH * 0.06, winW * 0.024, winH * 0.06);

  const shoreLights = 14;
  for (let i = 0; i < shoreLights; i++) {
    const lx = winX + ((i * 47) % winW);
    const ly = waterY - winH * (0.04 + ((i * 13) % 7) * 0.012);
    ctx.fillStyle = i % 3 === 0 ? "#e7c27a" : "#f4ead8";
    ctx.globalAlpha = 0.55 + (i % 4) * 0.1;
    ctx.fillRect(lx, ly, Math.max(1.5, w * 0.003), Math.max(1.5, w * 0.003));
  }
  ctx.globalAlpha = 1;

  const ferryT = (time * 0.035) % 1;
  const ferryX = winX + winW * (0.08 + ferryT * 0.7);
  const ferryY = waterY + winH * 0.08;
  ctx.fillStyle = "#8e2d32";
  ctx.fillRect(ferryX, ferryY, winW * 0.11, winH * 0.045);
  ctx.fillStyle = "#f4ead8";
  ctx.fillRect(ferryX + winW * 0.015, ferryY - winH * 0.04, winW * 0.08, winH * 0.04);
  ctx.fillStyle = "#9fd0e0";
  ctx.fillRect(ferryX + winW * 0.025, ferryY - winH * 0.03, winW * 0.02, winH * 0.018);

  const blink = 0.45 + Math.sin(time * 3.2) * 0.4;
  ctx.globalAlpha = blink;
  ctx.fillStyle = "#c44536";
  ctx.beginPath();
  ctx.arc(winX + winW * 0.2, waterY + winH * 0.12, Math.max(2, w * 0.004), 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#0e1a28";
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(winX, winY, winW, winH);
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY);
  ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH * 0.62);
  ctx.lineTo(winX + winW, winY + winH * 0.62);
  ctx.stroke();

  ctx.fillStyle = "#e7c98a";
  ctx.font = `600 ${Math.max(13, w * 0.022)}px Fraunces, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.fillText("HARBOUR CANDLEPIN", w / 2, winY + winH + h * 0.045);
  ctx.fillStyle = "#d7c4a4";
  ctx.font = `500 ${Math.max(9, w * 0.012)}px Outfit, sans-serif`;
  ctx.fillText("HALIFAX  ·  LANE 7  ·  EST. 1952", w / 2, winY + winH + h * 0.072);

  const glow = ctx.createRadialGradient(w * 0.12, h * 0.2, 2, w * 0.12, h * 0.2, w * 0.08);
  glow.addColorStop(0, "rgba(224, 177, 90, 0.28)");
  glow.addColorStop(1, "rgba(224, 177, 90, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, h * 0.08, w * 0.3, h * 0.22);
  const glowR = ctx.createRadialGradient(w * 0.88, h * 0.2, 2, w * 0.88, h * 0.2, w * 0.08);
  glowR.addColorStop(0, "rgba(224, 177, 90, 0.22)");
  glowR.addColorStop(1, "rgba(224, 177, 90, 0)");
  ctx.fillStyle = glowR;
  ctx.fillRect(w * 0.7, h * 0.08, w * 0.3, h * 0.22);
}

function laneEdge(z: number, side: number, w: number, h: number, extra = 0): { x: number; y: number } {
  const p = project(side * (LANE_HALF + extra), z, w, h);
  return { x: p.x, y: p.y };
}

function drawLane(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const z0 = -40;
  const z1 = HEAD_Z + 55;
  const slices = 28;
  for (let i = 0; i < slices; i++) {
    const a = z0 + ((z1 - z0) * i) / slices;
    const b = z0 + ((z1 - z0) * (i + 1)) / slices;
    const boards = 8;
    for (let k = 0; k < boards; k++) {
      const x0 = -LANE_HALF + (k * (LANE_HALF * 2)) / boards;
      const x1 = -LANE_HALF + ((k + 1) * (LANE_HALF * 2)) / boards;
      const p1 = project(x0, a, w, h);
      const p2 = project(x1, a, w, h);
      const p3 = project(x1, b, w, h);
      const p4 = project(x0, b, w, h);
      ctx.fillStyle = boardShade(k + i);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  const sheen = ctx.createLinearGradient(w * 0.35, 0, w * 0.65, 0);
  sheen.addColorStop(0, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,248,230,0.16)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  const near = project(0, z0, w, h);
  const far = project(0, HEAD_Z, w, h);
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.moveTo(project(-6, z0, w, h).x, near.y);
  ctx.lineTo(project(6, z0, w, h).x, near.y);
  ctx.lineTo(project(2.2, HEAD_Z, w, h).x, far.y);
  ctx.lineTo(project(-2.2, HEAD_Z, w, h).x, far.y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(90, 58, 32, 0.35)";
  ctx.lineWidth = 1;
  for (let k = 1; k < 8; k++) {
    const x = -LANE_HALF + (k * (LANE_HALF * 2)) / 8;
    ctx.beginPath();
    const steps = 12;
    for (let s = 0; s <= steps; s++) {
      const z = z0 + ((HEAD_Z + 20 - z0) * s) / steps;
      const p = project(x, z, w, h);
      if (s === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  const foulA = project(-LANE_HALF, 0, w, h);
  const foulB = project(LANE_HALF, 0, w, h);
  ctx.strokeStyle = "#f4ead8";
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(foulA.x, foulA.y);
  ctx.lineTo(foulB.x, foulB.y);
  ctx.stroke();

  for (let i = -3; i <= 3; i++) {
    const dot = project(i * 4.2, -26, w, h);
    ctx.fillStyle = "#2a211c";
    ctx.beginPath();
    ctx.ellipse(dot.x, dot.y, dot.scale * 0.55, dot.scale * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#1d3550";
  for (let i = -3; i <= 3; i++) {
    const tip = project(i * 3.1, ARROW_Z, w, h);
    const tail = project(i * 3.1, ARROW_Z - 16, w, h);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y - tip.scale * 1.1);
    ctx.lineTo(tip.x - tip.scale * 0.7, tip.y + tip.scale * 0.2);
    ctx.lineTo(tip.x + tip.scale * 0.7, tip.y + tip.scale * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1d3550";
    ctx.lineWidth = Math.max(1, tip.scale * 0.25);
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }

  for (const spot of PIN_LAYOUT) {
    const p = project(spot.x, spot.z, w, h);
    const rx = Math.max(2.2, p.scale * 1.05);
    const ry = Math.max(1.6, rx * 0.34);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(42, 24, 12, 0.45)";
    ctx.fill();
  }

  const gutter = 7;
  const g0 = laneEdge(z0, -1, w, h, 0);
  const g1 = laneEdge(z1, -1, w, h, 0);
  const g2 = laneEdge(z1, -1, w, h, gutter);
  const g3 = laneEdge(z0, -1, w, h, gutter);
  ctx.fillStyle = "#241910";
  ctx.beginPath();
  ctx.moveTo(g0.x, g0.y);
  ctx.lineTo(g1.x, g1.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.lineTo(g3.x, g3.y);
  ctx.closePath();
  ctx.fill();
  const r0 = laneEdge(z0, 1, w, h, 0);
  const r1 = laneEdge(z1, 1, w, h, 0);
  const r2 = laneEdge(z1, 1, w, h, gutter);
  const r3 = laneEdge(z0, 1, w, h, gutter);
  ctx.beginPath();
  ctx.moveTo(r0.x, r0.y);
  ctx.lineTo(r1.x, r1.y);
  ctx.lineTo(r2.x, r2.y);
  ctx.lineTo(r3.x, r3.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#3a2a22";
  const mask = (side: number) => {
    const a = laneEdge(-20, side, w, h, gutter);
    const b = laneEdge(HEAD_Z + 55, side, w, h, gutter);
    const outer = side < 0 ? 0 : w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(outer, h * 0.36);
    ctx.lineTo(outer, h);
    ctx.closePath();
    ctx.fill();
  };
  mask(-1);
  mask(1);

  ctx.strokeStyle = "#a97832";
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(g3.x, g3.y);
  ctx.lineTo(g2.x, g2.y);
  ctx.moveTo(r3.x, r3.y);
  ctx.lineTo(r2.x, r2.y);
  ctx.stroke();
}

function rowGap(w: number, h: number): number {
  const a = project(0, PIN_LAYOUT[0].z, w, h);
  const b = project(0, PIN_LAYOUT[1].z, w, h);
  return Math.max(18, Math.abs(a.y - b.y));
}

function pinSilhouette(ctx: CanvasRenderingContext2D, height: number): number {
  const mid = height * 0.155;
  const top = mid * 0.86;
  const foot = mid * 0.92;
  ctx.beginPath();
  ctx.moveTo(-foot, 0);
  ctx.quadraticCurveTo(-mid * 1.04, -height * 0.28, -mid, -height * 0.48);
  ctx.quadraticCurveTo(-top * 1.02, -height * 0.7, -top, -height * 0.9);
  ctx.lineTo(top, -height * 0.9);
  ctx.quadraticCurveTo(top * 1.02, -height * 0.7, mid, -height * 0.48);
  ctx.quadraticCurveTo(mid * 1.04, -height * 0.28, foot, 0);
  ctx.quadraticCurveTo(0, height * 0.04, -foot, 0);
  ctx.closePath();
  return top;
}

function drawStandingPin(ctx: CanvasRenderingContext2D, height: number, flash: number): void {
  const top = pinSilhouette(ctx, height);
  const wood = ctx.createLinearGradient(-top, 0, top, 0);
  wood.addColorStop(0, "#6a4128");
  wood.addColorStop(0.2, "#e4c498");
  wood.addColorStop(0.48, "#fff6e2");
  wood.addColorStop(0.74, "#c99660");
  wood.addColorStop(1, "#54321e");
  ctx.fillStyle = wood;
  ctx.fill();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fill();
  }
  ctx.save();
  pinSilhouette(ctx, height);
  ctx.clip();
  const band = -height * 0.72;
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(-height, band, height * 2, Math.max(1.6, height * 0.05));
  ctx.fillStyle = "#c44536";
  ctx.fillRect(-height, band + height * 0.05, height * 2, Math.max(1, height * 0.018));
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, -height * 0.9, top, Math.max(1.3, top * 0.38), 0, 0, Math.PI * 2);
  const cap = ctx.createLinearGradient(-top, -height, top, -height * 0.82);
  cap.addColorStop(0, "#b88858");
  cap.addColorStop(0.45, "#fff8ec");
  cap.addColorStop(1, "#8d623c");
  ctx.fillStyle = cap;
  ctx.fill();
  ctx.strokeStyle = "rgba(62, 36, 18, 0.45)";
  ctx.lineWidth = Math.max(1, top * 0.08);
  ctx.stroke();
}

function drawPin(ctx: CanvasRenderingContext2D, pin: Pin, w: number, h: number, time: number): void {
  if (pin.state === "out") return;
  const base = project(pin.x, pin.z, w, h);
  const gap = rowGap(w, h);
  const height = Math.min(Math.max(26, base.scale * 10.5), gap * 1.35);
  const radius = height * 0.13;
  const wob =
    pin.state === "wobble" ? Math.sin(time * 26 + pin.id) * pin.wobble * 0.22 : 0;
  ctx.save();
  ctx.translate(base.x, base.y);
  ctx.fillStyle = "rgba(40, 22, 10, 0.35)";
  ctx.beginPath();
  ctx.ellipse(wob * 6, base.scale * 0.28, radius * 1.1, radius * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();

  if (pin.state === "down") {
    ctx.rotate(pin.heading - Math.PI / 2);
    drawFallenPin(ctx, height * 0.92, radius);
  } else {
    const lift = pin.state === "fly" ? Math.sin(pin.tilt * Math.PI) * height * 0.35 : 0;
    ctx.translate(0, -lift);
    ctx.rotate(wob + (pin.state === "fly" ? pin.tilt * 0.9 * Math.sign(pin.heading || 1) : 0));
    drawStandingPin(ctx, height, pin.state === "fly" ? 0.35 * (1 - pin.tilt) : 0);
  }
  ctx.restore();
}

function drawFallenPin(ctx: CanvasRenderingContext2D, length: number, radius: number): void {
  const thick = Math.max(2.5, radius * 1.15);
  const cap = Math.max(1.6, radius * 0.42);
  const wood = ctx.createLinearGradient(0, -thick, 0, thick);
  wood.addColorStop(0, "#fff6e4");
  wood.addColorStop(0.42, "#e8c99a");
  wood.addColorStop(1, "#7a5233");
  ctx.beginPath();
  ctx.rect(-length / 2, -thick / 2, length, thick);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-length / 2, 0, cap, thick / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#fff3de";
  ctx.fill();
  ctx.strokeStyle = "rgba(74, 48, 28, 0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(length / 2, 0, cap, thick / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#8d6240";
  ctx.fill();
  ctx.fillStyle = "#1e3a5f";
  ctx.fillRect(-length * 0.06, -thick / 2, Math.max(2, length * 0.07), thick);
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  spinVisual: number,
  w: number,
  h: number,
): void {
  const p = project(x, z, w, h);
  const r = Math.max(5, BALL_R * p.scale);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(30, 16, 8, 0.35)";
  ctx.beginPath();
  ctx.ellipse(r * 0.15, r * 0.25, r * 0.95, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#f0c2b4");
  g.addColorStop(0.28, "#8a3a3a");
  g.addColorStop(0.7, "#3a1216");
  g.addColorStop(1, "#1a090c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, -r * 0.05, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(244, 234, 216, 0.35)";
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.72, r * 0.28, spinVisual, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGuide(
  ctx: CanvasRenderingContext2D,
  view: View,
): void {
  const path = predictPath(
    view.stance,
    view.target,
    view.pull ? view.pull.power : Math.max(view.power, 0.85),
    view.spin,
  );
  ctx.save();
  ctx.setLineDash([Math.max(4, view.w * 0.008), Math.max(6, view.w * 0.01)]);
  ctx.lineWidth = Math.max(1.5, view.w * 0.003);
  ctx.strokeStyle = "rgba(224, 177, 90, 0.85)";
  ctx.beginPath();
  path.forEach((point, index) => {
    const p = project(point.x, point.z, view.w, view.h);
    if (index === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  z: number,
  label: string,
  w: number,
  h: number,
  time: number,
): void {
  const p = project(x, z, w, h);
  const pulse = 1 + Math.sin(time * 4) * 0.06;
  const rad = Math.max(10, p.scale * 2.4) * pulse;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "rgba(224, 177, 90, 0.2)";
  ctx.beginPath();
  ctx.arc(0, 0, rad * 1.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e0b15a";
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f4ead8";
  ctx.font = `600 ${Math.max(10, w * 0.016)}px Outfit, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(label, 0, -rad - 4);
  ctx.restore();
}

function drawSetter(ctx: CanvasRenderingContext2D, world: World, view: View): void {
  const t = view.setter;
  if (t <= 0 || t >= 1) return;
  const { w, h } = view;
  const barZ = HEAD_Z + 16;
  const drop = t < 0.35 ? t / 0.35 : t > 0.7 ? (1 - t) / 0.3 : 1;
  const lift = t > 0.32 && t < 0.68 ? Math.sin(((t - 0.32) / 0.36) * Math.PI) : 0;
  const left = project(-LANE_HALF, barZ, w, h);
  const right = project(LANE_HALF, barZ, w, h);
  const y = left.y - drop * h * 0.12;
  ctx.strokeStyle = "#c4894a";
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.beginPath();
  ctx.moveTo(left.x, y);
  ctx.lineTo(right.x, y);
  ctx.stroke();
  for (const pin of world.pins) {
    if (pin.state === "out") continue;
    const p = project(pin.x, pin.z, w, h);
    ctx.strokeStyle = "rgba(244, 234, 216, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((left.x + right.x) / 2 + (p.x - w / 2) * 0.15, y);
    ctx.lineTo(p.x, p.y - lift * h * 0.08);
    ctx.stroke();
  }
}

function drawLeave(ctx: CanvasRenderingContext2D, world: World, view: View): void {
  const { w, h } = view;
  const pad = Math.max(8, w * 0.018);
  const iw = Math.min(w * 0.36, 210);
  const ih = iw * 1.2;
  const x = pad;
  const y = h * 0.56;
  ctx.save();
  roundRect(ctx, x, y, iw, ih, Math.max(8, w * 0.012));
  ctx.fillStyle = "rgba(244, 234, 216, 0.94)";
  ctx.fill();
  ctx.fillStyle = "#1a140f";
  ctx.font = `600 ${Math.max(10, w * 0.016)}px Outfit, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("LEAVE", x + 10, y + Math.max(14, w * 0.02));

  const zx0 = HEAD_Z - 28;
  const zx1 = HEAD_Z + 72;
  const innerX = x + 12;
  const innerY = y + Math.max(20, w * 0.028);
  const innerW = iw - 24;
  const innerH = ih - Math.max(32, w * 0.04);
  const toX = (inches: number) => innerX + ((inches + LANE_HALF) / (LANE_HALF * 2)) * innerW;
  const toY = (z: number) => innerY + innerH - ((z - zx0) / (zx1 - zx0)) * innerH;

  ctx.fillStyle = "#e7d3b0";
  ctx.fillRect(innerX, innerY, innerW, innerH);
  ctx.fillStyle = "#2a211c";
  ctx.fillRect(innerX, innerY, Math.max(3, innerW * 0.04), innerH);
  ctx.fillRect(innerX + innerW - Math.max(3, innerW * 0.04), innerY, Math.max(3, innerW * 0.04), innerH);

  const path = predictPath(view.stance, view.target, Math.max(view.power, 0.82), view.spin);
  ctx.strokeStyle = "#a97832";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let started = false;
  for (const point of path) {
    if (point.z < zx0 || point.z > zx1) continue;
    const px = toX(point.x);
    const py = toY(point.z);
    if (!started) {
      ctx.moveTo(px, py);
      started = true;
    } else ctx.lineTo(px, py);
  }
  ctx.stroke();

  for (const pin of world.pins) {
    if (pin.state === "out") continue;
    const px = toX(pin.x);
    const py = toY(pin.z);
    if (pin.state === "down" || pin.state === "fly") {
      ctx.strokeStyle = "#8d5a32";
      ctx.lineWidth = Math.max(2, iw * 0.02);
      ctx.beginPath();
      const len = Math.max(5, iw * 0.035);
      const hx = Math.sin(pin.heading) * len;
      const hy = -Math.cos(pin.heading) * len;
      ctx.moveTo(px - hx, py - hy);
      ctx.lineTo(px + hx, py + hy);
      ctx.stroke();
    } else {
      const dot = Math.max(3.2, iw * 0.02);
      ctx.fillStyle = pin.state === "wobble" ? "#c44536" : "#f7edd8";
      ctx.strokeStyle = "#1e3a5f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, dot, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1a140f";
      ctx.font = `700 ${Math.max(8, dot * 1.15)}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(pin.id), px, py + 0.5);
    }
  }
  ctx.restore();
}

function drawRackPlate(ctx: CanvasRenderingContext2D, world: World, w: number, h: number): void {
  let standing = 0;
  let top = Infinity;
  for (const pin of world.pins) {
    if (pin.state === "up" || pin.state === "wobble") standing += 1;
    if (pin.state === "out") continue;
    const p = project(pin.x, pin.z, w, h);
    const tip = p.y - Math.min(Math.max(26, p.scale * 10.5), rowGap(w, h) * 1.35);
    if (tip < top) top = tip;
  }
  if (!Number.isFinite(top)) return;
  const label = standing === 10 ? "10" : `${standing}`;
  ctx.save();
  ctx.font = `700 ${Math.max(11, w * 0.016)}px Outfit, sans-serif`;
  const textW = ctx.measureText(label).width;
  const box = Math.max(22, textW + 14);
  const cx = project(0, HEAD_Z, w, h).x;
  const y = Math.max(h * 0.2, top - box - 4);
  const x = cx - box / 2;
  roundRect(ctx, x, y, box, box, box / 2);
  ctx.fillStyle = "rgba(16, 32, 51, 0.78)";
  ctx.fill();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = "#e0b15a";
  ctx.stroke();
  ctx.fillStyle = "#f4ead8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, cx, y + box / 2 + 0.5);
  ctx.restore();
}

function drawPullCue(ctx: CanvasRenderingContext2D, view: View): void {
  if (!view.showMarks || view.pull) return;
  const ball = project(view.stance, BALL_Z, view.w, view.h);
  const bob = view.reduceMotion ? 0 : Math.sin(view.time * 3) * Math.max(3, view.h * 0.008);
  const y = ball.y - Math.max(18, ball.scale * 3.4) + bob;
  ctx.save();
  ctx.strokeStyle = "rgba(224, 177, 90, 0.9)";
  ctx.lineWidth = Math.max(1.5, view.w * 0.003);
  const s = Math.max(7, view.w * 0.011);
  ctx.beginPath();
  ctx.moveTo(ball.x - s, y);
  ctx.lineTo(ball.x, y - s * 0.85);
  ctx.lineTo(ball.x + s, y);
  ctx.stroke();
  ctx.restore();
}

function drawPullTether(ctx: CanvasRenderingContext2D, view: View): void {
  if (!view.pull) return;
  const ball = project(view.stance, BALL_Z, view.w, view.h);
  const sx = view.pull.nx * view.w;
  const sy = view.pull.ny * view.h;
  ctx.save();
  ctx.strokeStyle = "rgba(224, 177, 90, 0.95)";
  ctx.lineWidth = Math.max(2, view.w * 0.0045);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y);
  ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.fillStyle = "#e0b15a";
  ctx.beginPath();
  ctx.arc(sx, sy, Math.max(9, view.w * 0.014), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a140f";
  ctx.beginPath();
  ctx.arc(sx, sy, Math.max(4, view.w * 0.006), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function noise(t: number): number {
  return Math.sin(t * 41.2) * Math.sin(t * 17.7);
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  world: World,
  view: View,
): void {
  const { w, h } = view;
  ctx.clearRect(0, 0, w, h);
  const trauma = view.shake && !view.reduceMotion ? world.trauma * world.trauma : 0;
  const shakeX = trauma * Math.min(10, w * 0.012) * noise(view.time * 18);
  const shakeY = trauma * Math.min(7, h * 0.01) * noise(view.time * 23 + 2);
  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawRoom(ctx, w, h, view.reduceMotion ? 0 : view.time);
  drawLane(ctx, w, h);

  if (view.guide && view.showMarks) drawGuide(ctx, view);

  const sprites: { z: number; draw: () => void }[] = [];
  for (const pin of world.pins) {
    const lift = view.setter > 0.32 && view.setter < 0.68 && pin.state !== "out" ? 1 : 0;
    sprites.push({
      z: pin.z + lift * 20,
      draw: () => {
        ctx.save();
        if (lift) {
          const p = project(pin.x, pin.z, w, h);
          const rise = Math.sin(((view.setter - 0.32) / 0.36) * Math.PI) * h * 0.05;
          ctx.translate(0, -rise);
          void p;
        }
        drawPin(ctx, pin, w, h, view.time);
        ctx.restore();
      },
    });
  }
  if (world.ball && !world.ball.hidden) {
    const ball = world.ball;
    sprites.push({
      z: ball.z,
      draw: () => drawBall(ctx, ball.x, ball.z, ball.spinVisual, w, h),
    });
  }
  for (const particle of world.particles) {
    sprites.push({
      z: particle.z,
      draw: () => {
        const p = project(particle.x, particle.z, w, h);
        const alpha = Math.max(0, particle.life / particle.max);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.kind === "dust" ? "#f4ead8" : "#c4894a";
        ctx.fillRect(p.x, p.y, Math.max(1.5, p.scale * 0.35), Math.max(1.5, p.scale * 0.35));
        ctx.globalAlpha = 1;
      },
    });
  }
  sprites.sort((a, b) => b.z - a.z);
  for (const sprite of sprites) sprite.draw();

  if (view.showMarks) {
    drawMarker(ctx, view.target, HEAD_Z - 18, "AIM", w, h, view.time);
  }

  drawPullCue(ctx, view);
  drawPullTether(ctx, view);
  drawRackPlate(ctx, world, w, h);

  if (view.showLeave) drawLeave(ctx, world, view);

  drawSetter(ctx, world, view);

  const vignette = ctx.createLinearGradient(0, h * 0.75, 0, h);
  vignette.addColorStop(0, "rgba(8, 14, 22, 0)");
  vignette.addColorStop(1, "rgba(8, 14, 22, 0.28)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
  ctx.restore();
}
