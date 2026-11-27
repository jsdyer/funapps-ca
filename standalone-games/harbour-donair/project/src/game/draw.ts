import type { Art } from "@/game/art";
import {
  DOUGH_IDEAL,
  DOUGH_MAX,
  DOUGH_MIN,
  GOLD_MAX,
  GOLD_MIN,
  type Sim,
} from "@/game/logic";

const INK = "#142033";
const CREAM = "#fff4e0";
const GOLD = "#f0b429";
const SPICE = "#6b3a22";
const RED = "#e23d2b";

function easeOutBack(u: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (u - 1) ** 3 + c1 * (u - 1) ** 2;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function blit(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | undefined,
  x: number,
  y: number,
  size: number,
  rot: number,
) {
  if (!img) return false;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
}

export function draw(ctx: CanvasRenderingContext2D, sim: Sim, art: Art) {
  const canvas = ctx.canvas;
  const cssW = canvas.clientWidth || 320;
  const cssH = canvas.clientHeight || 320;
  const dpr = cssW > 0 ? canvas.width / cssW : 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const cx = cssW / 2;
  const cy = cssH / 2;
  const R = Math.min(cssW, cssH) * 0.4;
  const visual = sim.doughSet || sim.doughStretch > 0.42 ? sim.doughStretch / DOUGH_IDEAL : 0;

  ctx.save();
  if (sim.serve > 0) {
    const e = Math.min(1, sim.serve);
    ctx.globalAlpha = 1 - e * 0.85;
    ctx.translate(cx, cy - e * R * 0.55);
    ctx.scale(1 - e * 0.18, 1 - e * 0.18);
    ctx.translate(-cx, -cy);
  }

  circle(ctx, cx, cy, R * 1.08);
  ctx.fillStyle = "#c9844a";
  ctx.fill();

  if (!blit(ctx, art.pan, cx, cy, R * 2.16, 0)) {
    circle(ctx, cx, cy, R);
    ctx.fillStyle = "#3a332e";
    ctx.fill();
  }

  const showDough = sim.doughSet || sim.doughStretch > 0.42;
  if (showDough) {
    const size = R * 2 * Math.min(1.2, Math.max(0.45, visual));
    if (!blit(ctx, art.dough, cx, cy, size, 0)) {
      circle(ctx, cx, cy, size * 0.42);
      ctx.fillStyle = "#f3ddb0";
      ctx.fill();
    }
  } else {
    const bob = 1 + Math.sin(sim.t * 3.2) * 0.03;
    const size = R * (0.72 + sim.doughStretch * 0.35) * bob;
    if (!blit(ctx, art.ball, cx, cy - R * 0.02, size, 0)) {
      circle(ctx, cx, cy, size * 0.42);
      ctx.fillStyle = "#f6e2b8";
      ctx.fill();
    }
  }

  if (sim.step === "dough" && !sim.doughSet) {
    const inner = R * (DOUGH_MIN / DOUGH_IDEAL);
    const outer = R * (DOUGH_MAX / DOUGH_IDEAL);
    ctx.save();
    ctx.strokeStyle = sim.doughStretch >= DOUGH_MIN && sim.doughStretch <= DOUGH_MAX ? GOLD : "rgba(240, 180, 41, 0.55)";
    ctx.lineWidth = sim.doughStretch >= DOUGH_MIN && sim.doughStretch <= DOUGH_MAX ? 8 : 4;
    ctx.setLineDash([10, 8]);
    circle(ctx, cx, cy, (inner + outer) / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  const bake = sim.bakeSet ?? (sim.step === "oven" || sim.step === "sauce" || sim.serve > 0 ? sim.bake : 0);

  for (const topping of sim.toppings) {
    const age = Math.min(1, Math.max(0, (sim.t - topping.born) / 0.16));
    const pop = easeOutBack(age);
    const x = cx + topping.x * R;
    const y = cy + topping.y * R;
    let size = R * 0.34 * topping.scale * pop;
    let img = art.cheese;
    if (topping.kind === "meat") {
      size = R * 0.72 * topping.scale * pop;
      img = topping.variant % 2 === 0 ? art.meatA : art.meatB;
    } else if (topping.kind === "tomato") {
      size = R * 0.34 * topping.scale * pop;
      img = art.tomato;
    } else if (topping.kind === "onion") {
      size = R * 0.32 * topping.scale * pop;
      img = art.onion;
    } else if (topping.kind === "cheese") {
      size = R * 0.46 * topping.scale * pop;
      img = art.cheese;
    }
    ctx.save();
    ctx.shadowColor = "rgba(20, 32, 51, 0.22)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    const drew = blit(ctx, img, x, y, size, topping.rot);
    ctx.restore();
    if (!drew) {
      circle(ctx, x, y, size * 0.28);
      ctx.fillStyle =
        topping.kind === "meat" ? SPICE : topping.kind === "tomato" ? RED : topping.kind === "onion" ? CREAM : "#fff";
      ctx.fill();
    }
  }

  if (bake > 0.04 && (sim.doughSet || showDough)) {
    const doughR = R * Math.min(1.05, Math.max(0.7, visual || 1));
    ctx.save();
    circle(ctx, cx, cy, doughR * 0.9);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = Math.min(0.62, bake * 0.55);
    ctx.fillStyle = bake > 0.9 ? "#4a2618" : "#e2a24a";
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = `rgba(92, 42, 16, ${Math.min(0.95, 0.25 + bake)})`;
    ctx.lineWidth = 8 + bake * 14;
    circle(ctx, cx, cy, doughR * 0.86);
    ctx.stroke();
    ctx.restore();

    if (bake > 0.86) {
      ctx.save();
      const char = Math.min(1, (bake - 0.86) / 0.14);
      ctx.fillStyle = `rgba(36, 16, 10, ${char * 0.75})`;
      for (let i = 0; i < 5; i++) {
        const a = i * 2.3 + 0.4;
        const rr = doughR * (0.25 + (i % 3) * 0.18);
        circle(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 8 + i * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (sim.sauce.length > 1) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(20, 32, 51, 0.18)";
    ctx.shadowBlur = 2;
    ctx.beginPath();
    sim.sauce.forEach((p, i) => {
      const x = cx + p.x * R;
      const y = cy + p.y * R;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(107, 58, 34, 0.72)";
    ctx.lineWidth = Math.max(16, R * 0.125);
    ctx.stroke();
    ctx.strokeStyle = "#fff6dc";
    ctx.lineWidth = Math.max(9, R * 0.07);
    ctx.stroke();
    ctx.restore();
  }

  for (const p of sim.particles) {
    const alpha = Math.max(0, p.life / p.max);
    const x = cx + p.x * R;
    const y = cy + p.y * R;
    ctx.beginPath();
    ctx.fillStyle =
      p.kind === "spark"
        ? `rgba(240, 180, 41, ${alpha})`
        : p.kind === "steam"
          ? `rgba(255, 244, 224, ${alpha * 0.55})`
          : `rgba(255, 250, 240, ${alpha * 0.85})`;
    ctx.arc(x, y, p.size * (p.kind === "steam" ? 1.4 : 1), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (sim.step === "oven" && sim.bakeSet == null) {
    const barW = cssW * 0.72;
    const barH = 14;
    const x = cx - barW / 2;
    const y = cssH - 28;
    ctx.fillStyle = "rgba(20, 32, 51, 0.35)";
    roundRect(ctx, x, y, barW, barH, 8);
    ctx.fill();
    const g0 = x + barW * GOLD_MIN;
    const g1 = x + barW * GOLD_MAX;
    ctx.fillStyle = GOLD;
    roundRect(ctx, g0, y, g1 - g0, barH, 6);
    ctx.fill();
    const mx = x + barW * Math.min(1, sim.bake);
    ctx.fillStyle = INK;
    circle(ctx, mx, y + barH / 2, 9);
    ctx.fill();
    ctx.fillStyle = bakeIn(sim.bake) ? CREAM : CREAM;
    circle(ctx, mx, y + barH / 2, 5);
    ctx.fill();
  }
}

function bakeIn(b: number) {
  return b >= GOLD_MIN && b <= GOLD_MAX;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
