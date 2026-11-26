import { ready, type ArtBook } from "@/game/assets";
import {
  ISLAND,
  LABELS,
  POINT,
  ROCKS,
  SOUTH,
  TREES,
  WHARF,
  WORLD_H,
  WORLD_W,
  type Pt,
} from "@/game/world";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "wake" | "splash" | "bubble";
  r: number;
};

export type Floater = {
  x: number;
  y: number;
  text: string;
  life: number;
  max: number;
  tone: "good" | "gold" | "soft";
};

export type Critter = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rot: number;
};

export type DrawBuoy = {
  id: number;
  x: number;
  y: number;
  mine: boolean;
  spent: boolean;
  next: boolean;
};

export type Frame = {
  art: ArtBook;
  land: HTMLCanvasElement | null;
  width: number;
  height: number;
  camX: number;
  camY: number;
  scale: number;
  biasY: number;
  shakeX: number;
  shakeY: number;
  time: number;
  fog: number;
  boat: { x: number; y: number; yaw: number; lean: number };
  rival: { x: number; y: number; yaw: number };
  buoys: DrawBuoy[];
  gulls: { x: number; y: number; yaw: number }[];
  kelp: { x: number; y: number; rot: number }[];
  particles: Particle[];
  floats: Floater[];
  critters: Critter[];
  haul: { x: number; y: number; fromX: number; fromY: number } | null;
  dock: { x: number; y: number; r: number; hot: boolean };
  guide: { x: number; y: number; label: string; tone: "pot" | "wharf" } | null;
  calm: boolean;
};

const SPARKS = Array.from({ length: 42 }, (_, i) => ({
  x: 180 + ((i * 829) % 3600),
  y: 180 + ((i * 521) % 1700),
}));

export function bakeLand(art: ArtBook): HTMLCanvasElement {
  const bake = 0.5;
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(WORLD_W * bake);
  canvas.height = Math.floor(WORLD_H * bake);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(bake, bake);
  ctx.imageSmoothingEnabled = true;

  fillPoly(ctx, SOUTH, "#1b4536");
  fillPoly(ctx, POINT, "#1a4033");
  fillPoly(ctx, ISLAND, "#214e3d");
  strokeChain(ctx, SOUTH.slice(1, 10), "rgba(214, 184, 122, 0.95)", 26);
  strokeChain(ctx, POINT.slice(1), "rgba(214, 184, 122, 0.9)", 22);
  strokeClosed(ctx, ISLAND, "rgba(214, 184, 122, 0.9)", 20);

  const roofs: Pt[] = [
    [240, 2220],
    [400, 2160],
    [560, 2100],
    [900, 2088],
    [1080, 2140],
    [1240, 2220],
  ];
  for (const [x, y] of roofs) {
    ctx.fillStyle = "#f3ecdf";
    ctx.fillRect(x, y, 36, 22);
    ctx.fillStyle = "#b64032";
    ctx.fillRect(x - 2, y - 6, 40, 8);
  }

  for (const tree of TREES) {
    blit(ctx, art.spruce, tree.x, tree.y, 92 * tree.scale, 92 * tree.scale, tree.rot);
  }
  for (const rock of ROCKS) {
    blit(ctx, art.rock, rock.x, rock.y, 108 * rock.scale, 96 * rock.scale, rock.scale);
  }

  if (ready(art.wharf)) {
    ctx.save();
    ctx.translate(WHARF.x, WHARF.y);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(art.wharf, -190, -58, 380, 116);
    ctx.restore();
  }
  if (ready(art.light)) {
    const w = 78;
    const h = 168;
    ctx.drawImage(art.light, 3160 - w / 2, 700 - h, w, h);
  }
  return canvas;
}

export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame) {
  const { width: w, height: h } = frame;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(frame.shakeX, frame.shakeY);

  drawWater(ctx, frame);

  if (frame.land) {
    const origin = worldToScreen(frame, 0, 0);
    ctx.drawImage(frame.land, origin.x, origin.y, WORLD_W * frame.scale, WORLD_H * frame.scale);
  }

  drawFoam(ctx, frame);
  drawLabels(ctx, frame);

  for (const patch of frame.kelp) {
    const bob = Math.sin(frame.time * 1.3 + patch.x * 0.01) * 0.08;
    blitScreen(ctx, frame, frame.art.kelp, patch.x, patch.y, 92, 70, patch.rot + bob);
  }

  if (frame.dock.hot) {
    const p = worldToScreen(frame, frame.dock.x, frame.dock.y);
    const rad = frame.dock.r * frame.scale;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214, 184, 122, 0.22)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(244, 239, 228, 0.85)";
    ctx.stroke();
  }

  for (const buoy of frame.buoys) {
    drawBuoy(ctx, frame, buoy);
  }

  if (frame.haul) {
    const a = worldToScreen(frame, frame.haul.fromX, frame.haul.fromY);
    const b = worldToScreen(frame, frame.haul.x, frame.haul.y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = "rgba(244, 239, 228, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
    blitScreen(ctx, frame, frame.art.trap, frame.haul.x, frame.haul.y, 42, 36, frame.time * 0.4);
  }

  for (const particle of frame.particles) drawParticle(ctx, frame, particle);

  blitScreen(ctx, frame, frame.art.rival, frame.rival.x, frame.rival.y, 52, 96, -frame.rival.yaw);
  blitScreen(ctx, frame, frame.art.boat, frame.boat.x, frame.boat.y, 58, 108, -frame.boat.yaw + frame.boat.lean);

  for (const critter of frame.critters) {
    blitScreen(ctx, frame, frame.art.lobster, critter.x, critter.y, 28, 22, critter.rot);
  }

  for (const gull of frame.gulls) {
    const flap = frame.calm ? 0 : Math.sin(frame.time * 6 + gull.x) * 0.12;
    blitScreen(ctx, frame, frame.art.gull, gull.x, gull.y, 40, 34, -gull.yaw + flap);
  }

  drawFloats(ctx, frame);
  if (frame.guide) drawGuide(ctx, frame, frame.guide);

  if (frame.fog > 0.02) {
    const boat = worldToScreen(frame, frame.boat.x, frame.boat.y);
    const fog = ctx.createRadialGradient(boat.x, boat.y, 70, boat.x, boat.y, Math.max(w, h) * 0.62);
    fog.addColorStop(0, "rgba(186, 206, 206, 0)");
    fog.addColorStop(1, `rgba(176, 196, 198, ${0.55 * frame.fog})`);
    ctx.fillStyle = fog;
    ctx.fillRect(-20, -20, w + 40, h + 40);
  }

  ctx.restore();
}

function drawWater(ctx: CanvasRenderingContext2D, frame: Frame) {
  const { width: w, height: h } = frame;
  const wash = ctx.createLinearGradient(0, 0, w * 0.2, h);
  wash.addColorStop(0, "#083846");
  wash.addColorStop(0.45, "#0c5664");
  wash.addColorStop(1, "#147888");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.strokeStyle = "rgba(210, 236, 230, 0.16)";
  ctx.lineWidth = 1.5;
  const step = Math.max(16, 26 * frame.scale);
  for (let y = -step; y < h + step; y += step) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const worldX = frame.camX + (x - w / 2) / frame.scale;
      const worldY = frame.camY + (y - h / 2 - frame.biasY) / frame.scale;
      const wy =
        y +
        Math.sin(worldX * 0.011 + frame.time * 0.7) * 3.2 * frame.scale +
        Math.sin(worldY * 0.02 + frame.time * 0.45) * 1.6 * frame.scale;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }
  ctx.restore();

  for (const spark of SPARKS) {
    const p = worldToScreen(frame, spark.x, spark.y);
    if (p.x < -10 || p.y < -10 || p.x > w + 10 || p.y > h + 10) continue;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame.time * 1.7 + spark.x));
    ctx.fillStyle = `rgba(244, 239, 228, ${0.18 + tw * 0.35})`;
    ctx.fillRect(p.x, p.y, 2, 2);
  }
}

function drawFoam(ctx: CanvasRenderingContext2D, frame: Frame) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(244, 239, 228, 0.5)";
  ctx.lineWidth = 2.5;
  foamChain(ctx, frame, SOUTH.slice(1, 10), false);
  foamChain(ctx, frame, POINT.slice(1), false);
  foamChain(ctx, frame, ISLAND, true);
  ctx.restore();
}

function foamChain(ctx: CanvasRenderingContext2D, frame: Frame, pts: readonly Pt[], close: boolean) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const wobble = Math.sin(x * 0.018 + frame.time * 1.3 + y * 0.01) * 4;
    const p = worldToScreen(frame, x, y + wobble);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  if (close) ctx.closePath();
  ctx.stroke();
}

function drawLabels(ctx: CanvasRenderingContext2D, frame: Frame) {
  ctx.save();
  ctx.font = "600 13px Fraunces, Palatino, serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(244, 239, 228, 0.78)";
  for (const label of LABELS) {
    const p = worldToScreen(frame, label.x, label.y);
    if (p.x < -80 || p.x > frame.width + 80 || p.y < -20 || p.y > frame.height + 20) continue;
    ctx.fillText(label.text, p.x, p.y);
  }
  ctx.restore();
}

function drawBuoy(ctx: CanvasRenderingContext2D, frame: Frame, buoy: DrawBuoy) {
  const bob = Math.sin(frame.time * 2 + buoy.id) * 3;
  const img = buoy.mine ? frame.art.buoy : frame.art.buoyOther;
  ctx.save();
  if (buoy.spent) ctx.globalAlpha = 0.45;
  blitScreen(ctx, frame, img, buoy.x, buoy.y + bob, buoy.mine ? 30 : 26, buoy.mine ? 36 : 32, 0);
  ctx.restore();
  if (!buoy.next || buoy.spent) return;
  const p = worldToScreen(frame, buoy.x, buoy.y);
  const pulse = 18 + Math.sin(frame.time * 4) * 4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, (pulse + 16) * frame.scale, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(230, 201, 138, 0.95)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawParticle(ctx: CanvasRenderingContext2D, frame: Frame, particle: Particle) {
  const p = worldToScreen(frame, particle.x, particle.y);
  const t = Math.max(0, particle.life / particle.max);
  if (particle.kind === "bubble") {
    ctx.beginPath();
    ctx.arc(p.x, p.y, particle.r * frame.scale * (1.4 - t), 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244, 239, 228, ${t * 0.7})`;
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, particle.r * frame.scale * (2 - t), particle.r * frame.scale * 0.7, 0, 0, Math.PI * 2);
  ctx.fillStyle =
    particle.kind === "splash" ? `rgba(244, 239, 228, ${t * 0.75})` : `rgba(226, 240, 236, ${t * 0.45})`;
  ctx.fill();
}

function drawFloats(ctx: CanvasRenderingContext2D, frame: Frame) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "600 18px Outfit, sans-serif";
  for (const floater of frame.floats) {
    const t = floater.life / floater.max;
    const p = worldToScreen(frame, floater.x, floater.y - (1 - t) * 28);
    ctx.globalAlpha = Math.max(0, Math.min(1, t));
    ctx.fillStyle = floater.tone === "gold" ? "#e6c98a" : floater.tone === "soft" ? "#d5e3e4" : "#f4efe4";
    ctx.fillText(floater.text, p.x, p.y);
  }
  ctx.restore();
}

function drawGuide(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  guide: { x: number; y: number; label: string; tone: "pot" | "wharf" },
) {
  const p = worldToScreen(frame, guide.x, guide.y);
  const pad = 64;
  const inside = p.x > pad && p.y > pad && p.x < frame.width - pad && p.y < frame.height - pad;
  if (inside && guide.tone === "pot") return;
  const ang = Math.atan2(p.y - frame.height / 2, p.x - frame.width / 2);
  const rad = Math.min(frame.width, frame.height) * 0.34;
  const ax = inside ? p.x : frame.width / 2 + Math.cos(ang) * rad;
  const ay = inside ? p.y - 36 : frame.height / 2 + Math.sin(ang) * rad;
  ctx.save();
  ctx.translate(ax, ay);
  if (!inside) ctx.rotate(ang);
  ctx.fillStyle = guide.tone === "wharf" ? "#e6c98a" : "#e23d2b";
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-8, 9);
  ctx.lineTo(-8, -9);
  ctx.closePath();
  ctx.fill();
  ctx.rotate(inside ? 0 : -ang);
  ctx.font = "600 12px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#f4efe4";
  ctx.fillText(guide.label, 0, 26);
  ctx.restore();
}

function worldToScreen(frame: Frame, x: number, y: number) {
  return {
    x: (x - frame.camX) * frame.scale + frame.width / 2,
    y: (y - frame.camY) * frame.scale + frame.height / 2 + frame.biasY,
  };
}

function blitScreen(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
) {
  if (!ready(img)) return;
  const p = worldToScreen(frame, x, y);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rot);
  ctx.drawImage(img, (-w / 2) * frame.scale, (-h / 2) * frame.scale, w * frame.scale, h * frame.scale);
  ctx.restore();
}

function blit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  rot: number,
) {
  if (!ready(img)) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function fillPoly(ctx: CanvasRenderingContext2D, poly: readonly Pt[], color: string) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function strokeChain(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, width: number) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function strokeClosed(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, width: number) {
  strokeChain(ctx, pts, color, width);
  ctx.closePath();
  ctx.stroke();
}
