import { FINISH, TIME_LIMIT, makeCourse, speedAt, type Deco, type Ent, type Kind } from "./course";
import { Sound } from "./audio";

export type Phase = "loading" | "menu" | "play" | "pause" | "board" | "win" | "lose";

export interface Hud {
  phase: Phase;
  time: number;
  score: number;
  berries: number;
  postcards: number;
  tokens: number;
  dist: number;
  finish: number;
  best: number;
  banner: string;
  hint: string;
  muted: boolean;
  seed: number;
  closeCall: boolean;
  timeBonus: number;
}

type ArtName =
  | "sky"
  | "water"
  | "peaks"
  | "cliffs"
  | "trees"
  | "moose"
  | "boat"
  | "dock"
  | "log"
  | "rock"
  | "branch"
  | "berries"
  | "token"
  | "postcard"
  | "gull"
  | "run1"
  | "run2"
  | "run3"
  | "run4"
  | "jump1"
  | "jump2"
  | "jump3"
  | "jump4"
  | "duck1"
  | "duck2"
  | "duck3"
  | "duck4";

const art = (file: string) => `${import.meta.env.BASE_URL}game/${file}`;

const SRC: Record<ArtName, string> = {
  sky: art("sky.jpg"),
  water: art("water.jpg"),
  peaks: art("peaks.png"),
  cliffs: art("cliffs.png"),
  trees: art("trees.png"),
  moose: art("moose.png"),
  boat: art("boat.png"),
  dock: art("dock.png"),
  log: art("log.png"),
  rock: art("rock.png"),
  branch: art("branch.png"),
  berries: art("berries.png"),
  token: art("token.png"),
  postcard: art("postcard.png"),
  gull: art("gull.png"),
  run1: art("hero-run-1.png"),
  run2: art("hero-run-2.png"),
  run3: art("hero-run-3.png"),
  run4: art("hero-run-4.png"),
  jump1: art("hero-jump-1.png"),
  jump2: art("hero-jump-2.png"),
  jump3: art("hero-jump-3.png"),
  jump4: art("hero-jump-4.png"),
  duck1: art("hero-duck-1.png"),
  duck2: art("hero-duck-2.png"),
  duck3: art("hero-duck-3.png"),
  duck4: art("hero-duck-4.png"),
};

const BEST_KEY = "last-boat-best";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  active: boolean;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  life: number;
  active: boolean;
}

const DRAW: Record<Exclude<Kind, "gap">, { w: number; lift: number }> = {
  rock: { w: 1.2, lift: 0 },
  log: { w: 1.85, lift: -0.02 },
  branch: { w: 2.55, lift: 1.38 },
  moose: { w: 2.85, lift: 0 },
  berry: { w: 0.62, lift: 0.55 },
  token: { w: 0.48, lift: 1.02 },
  postcard: { w: 0.46, lift: 0.9 },
};

export function loadArt() {
  const entries = Object.entries(SRC) as [ArtName, string][];
  return Promise.all(
    entries.map(
      ([, url]) =>
        new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(img);
          img.src = url;
        }),
    ),
  ).then((imgs) => {
    const out = {} as Record<ArtName, HTMLImageElement>;
    entries.forEach(([key], i) => {
      out[key] = imgs[i];
    });
    return out;
  });
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function writeBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* private mode */
  }
}

export class Game {
  private ctx: CanvasRenderingContext2D;
  private art: Record<ArtName, HTMLImageElement>;
  private sound: Sound;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private reduce: boolean;
  w = 1;
  h = 1;
  private viewM = 18;
  private ppm = 60;

  phase: Phase = "menu";
  worldX = 0;
  timeLeft = TIME_LIMIT;
  y = 0;
  vy = 0;
  onGround = true;
  coyote = 0;
  buffer = 0;
  duckHeld = false;
  duckT = 0;
  stumble = 0;
  invuln = 0;
  anim = 0;
  landT = 0;
  jumpT = 0;
  berries = 0;
  tokens = 0;
  postcards = 0;
  scrapes = 0;
  collects = 0;
  timeBonus = 0;
  seed = 1;
  best = 0;
  banner = "";
  bannerT = 0;
  hint = "Space or tap to jump";
  closeCall = false;
  horned = false;
  boatX = FINISH + 2.4;
  boardT = 0;
  camX = 0;
  attract = 0;
  clock = 0;
  trauma = 0;
  flash = 0;
  footT = 0;
  heroSlide = 0;

  ents: Ent[] = [];
  decos: Deco[] = [];
  private parts: Particle[] = [];
  private floats: Floater[] = [];

  jumpEdge = false;
  pauseEdge = false;

  onChange: () => void = () => {};

  constructor(
    canvas: HTMLCanvasElement,
    art: Record<ArtName, HTMLImageElement>,
    sound: Sound,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    this.ctx = ctx;
    this.art = art;
    this.sound = sound;
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.best = readBest();
    this.parts = Array.from({ length: 140 }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 2,
      color: "#fff",
      active: false,
    }));
    this.floats = Array.from({ length: 16 }, () => ({
      x: 0,
      y: 0,
      text: "",
      life: 0,
      active: false,
    }));
    this.seed = 1000 + Math.floor(Math.random() * 9000);
    this.reset(this.seed, false);
  }

  resize(cssW: number, cssH: number, dpr: number) {
    this.w = Math.max(1, cssW);
    this.h = Math.max(1, cssH);
    this.viewM = Math.min(21, Math.max(14.5, cssW / 52));
    this.ppm = this.w / this.viewM;
    const canvas = this.ctx.canvas;
    canvas.width = Math.floor(this.w * dpr);
    canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  startLoop() {
    this.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.acc += dt;
      let steps = 0;
      while (this.acc >= 1 / 60 && steps < 4) {
        this.step(1 / 60);
        this.acc -= 1 / 60;
        steps += 1;
      }
      this.draw(dt);
      this.sound.tick(this.phase === "menu" || this.phase === "play" || this.phase === "board");
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  unlock() {
    this.sound.unlock();
  }

  play(seed?: number) {
    this.sound.unlock();
    this.reset(seed ?? 1000 + Math.floor(Math.random() * 9000), true);
    this.phase = "play";
    this.onChange();
  }

  togglePause() {
    if (this.phase === "play") this.phase = "pause";
    else if (this.phase === "pause") {
      this.sound.resume();
      this.phase = "play";
    }
    this.onChange();
  }

  toggleMute() {
    this.sound.unlock();
    this.sound.toggleMute();
    this.onChange();
  }

  hud(): Hud {
    const distScore = Math.floor(Math.min(this.worldX, FINISH));
    return {
      phase: this.phase,
      time: Math.max(0, this.timeLeft),
      score: distScore + this.collects + this.timeBonus,
      berries: this.berries,
      postcards: this.postcards,
      tokens: this.tokens,
      dist: Math.min(FINISH, this.worldX),
      finish: FINISH,
      best: this.best,
      banner: this.bannerT > 0 ? this.banner : "",
      hint: this.phase === "play" ? this.hint : "",
      muted: this.sound.muted,
      seed: this.seed,
      closeCall: this.closeCall,
      timeBonus: this.timeBonus,
    };
  }

  private reset(seed: number, fresh: boolean) {
    const course = makeCourse(seed);
    this.ents = course.ents;
    this.decos = course.decos;
    this.seed = seed;
    this.worldX = 0;
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.coyote = 0;
    this.buffer = 0;
    this.duckT = 0;
    this.stumble = 0;
    this.invuln = 0;
    this.anim = 0;
    this.landT = 0;
    this.jumpT = 0;
    this.berries = 0;
    this.tokens = 0;
    this.postcards = 0;
    this.scrapes = 0;
    this.collects = 0;
    this.timeBonus = 0;
    this.timeLeft = TIME_LIMIT;
    this.banner = "";
    this.bannerT = 0;
    this.hint = "Space or tap to jump";
    this.closeCall = false;
    this.horned = false;
    this.boatX = FINISH + 2.2;
    this.boardT = 0;
    this.heroSlide = 0;
    this.trauma = 0;
    this.flash = 0;
    this.jumpEdge = false;
    if (fresh) this.attract = 0;
    for (const p of this.parts) p.active = false;
    for (const f of this.floats) f.active = false;
  }

  private step(dt: number) {
    this.clock += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dt * 1.7);
    if (this.landT > 0) this.landT -= dt;

    if (this.phase === "menu") {
      this.attract += dt * 2.5;
      this.anim += dt;
      this.stepParticles(dt);
      return;
    }
    if (this.phase === "pause" || this.phase === "loading") return;

    if (this.phase === "board" || this.phase === "win") {
      this.boardT += dt;
      this.boatX += dt * (2.2 + this.boardT * 1.4);
      this.anim += dt;
      this.stepParticles(dt);
      if (this.phase === "board" && this.boardT > 2.55) {
        this.timeBonus = Math.ceil(Math.max(0, this.timeLeft)) * 15;
        this.phase = "win";
        this.sound.win();
        this.commitBest();
        this.onChange();
      }
      return;
    }

    if (this.phase === "lose") {
      this.boatX += dt * 6.5;
      this.stepParticles(dt);
      return;
    }

    if (this.pauseEdge) {
      this.pauseEdge = false;
      this.phase = "pause";
      this.onChange();
      return;
    }

    const ducking = this.duckHeld || this.duckT > 0;
    if (this.duckHeld && this.onGround && this.stumble <= 0) this.duckT = Math.max(this.duckT, 0.02);
    if (!this.duckHeld) this.duckT = Math.max(0, this.duckT - dt);
    else this.duckT += dt;

    if (this.jumpEdge) {
      this.buffer = 0.12;
      this.jumpEdge = false;
    } else this.buffer = Math.max(0, this.buffer - dt);

    if (this.stumble > 0) this.stumble -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    const wantJump = this.buffer > 0 && this.stumble <= 0 && !this.duckHeld;
    if (wantJump && (this.onGround || this.coyote > 0)) {
      this.vy = 8.75;
      this.onGround = false;
      this.coyote = 0;
      this.buffer = 0;
      this.duckT = 0;
      this.jumpT = 0.08;
      this.sound.jump();
    }
    if (this.jumpT > 0) this.jumpT -= dt;

    if (!this.onGround) {
      this.vy -= 26.5 * dt;
      if (this.vy < -16) this.vy = -16;
      this.y += this.vy * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.onGround = true;
        this.landT = 0.12;
        this.sound.land();
        this.burst(this.worldX, 0.1, 7, "#d7c4a2");
      }
    } else {
      this.coyote = 0.12;
    }
    if (!this.onGround) this.coyote = Math.max(0, this.coyote - dt);

    let sp = speedAt(this.worldX);
    if (this.stumble > 0) sp *= 0.42;
    this.worldX += sp * dt;
    this.anim += dt * (0.65 + sp * 0.08);
    this.timeLeft -= dt;

    if (this.onGround && this.stumble <= 0 && !ducking) {
      this.footT -= dt;
      if (this.footT <= 0) {
        this.footT = 0.28;
        this.sound.foot();
        this.burst(this.worldX - 0.1, 0.05, 2, "#cbb89a");
      }
    }

    if (!this.horned && this.timeLeft <= 15) {
      this.horned = true;
      this.sound.horn();
      this.say("The horn.");
    }
    if (this.timeLeft < 12) this.boatX += dt * 0.55;

    this.collide(ducking && this.onGround);

    if (this.worldX >= FINISH && this.timeLeft > -0.04) {
      this.phase = "board";
      this.boardT = 0;
      this.y = 0;
      this.vy = 0;
      this.onChange();
    } else if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.phase = "lose";
      this.closeCall = this.worldX > FINISH - 18;
      this.sound.lose();
      this.commitBest();
      this.onChange();
    }

    this.stepParticles(dt);
  }

  private collide(ducking: boolean) {
    const px = this.worldX - 0.2;
    const py = this.y + (ducking ? 0.06 : 0.16);
    const pw = 0.4;
    const ph = ducking ? 0.58 : 1.28;
    for (const ent of this.ents) {
      if (!ent.alive) continue;
      if (ent.x > this.worldX + 3 || ent.x + ent.w < this.worldX - 2) continue;
      const hit =
        px < ent.x + ent.w && px + pw > ent.x && py < ent.y + ent.h && py + ph > ent.y;
      if (!hit) continue;
      if (ent.kind === "berry" || ent.kind === "token" || ent.kind === "postcard") {
        ent.alive = false;
        if (ent.kind === "berry") {
          this.berries += 1;
          this.collects += 25;
          this.sound.berry();
          this.floatAt(ent.x, ent.y + 0.4, "+25");
          this.burst(ent.x, ent.y, 6, "#d64545");
        } else if (ent.kind === "token") {
          this.tokens += 1;
          this.collects += 50;
          this.timeLeft += 4.5;
          this.sound.token();
          this.floatAt(ent.x, ent.y + 0.4, "+4.5s");
          this.say("They held the rope.");
        } else {
          this.postcards += 1;
          this.collects += 100;
          this.sound.postcard();
          this.floatAt(ent.x, ent.y + 0.5, "+100");
          this.say(ent.label || "Postcard");
        }
        continue;
      }
      if (ent.kind === "gap") {
        if (this.y > 0.34 || this.invuln > 0) continue;
      } else if (this.invuln > 0) continue;
      this.stumble = 0.48;
      this.invuln = 1.15;
      this.scrapes += 1;
      this.timeLeft -= 3.2;
      this.vy = 3.1;
      this.y = Math.max(this.y, 0.05);
      this.onGround = false;
      this.trauma = Math.min(1, this.trauma + 0.55);
      this.flash = 0.12;
      this.sound.hit();
      this.floatAt(this.worldX, 1.4, "−3s");
      this.burst(this.worldX, 0.6, 10, "#f4efe6");
      break;
    }
    if (this.worldX < 48) this.hint = "Space or tap to jump";
    else if (this.worldX < 130) this.hint = "Down to duck the spruce";
    else this.hint = "";
  }

  private say(text: string) {
    this.banner = text;
    this.bannerT = 1.7;
    this.onChange();
  }

  private commitBest() {
    const score = Math.floor(Math.min(this.worldX, FINISH)) + this.collects + this.timeBonus;
    if (score > this.best) {
      this.best = score;
      writeBest(score);
    }
  }

  private burst(x: number, y: number, n: number, color: string) {
    let left = n;
    for (const p of this.parts) {
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = (Math.random() - 0.4) * 2.2;
      p.vy = Math.random() * 2.4;
      p.life = 0.35 + Math.random() * 0.25;
      p.max = p.life;
      p.size = 2 + Math.random() * 3;
      p.color = color;
      left -= 1;
      if (left <= 0) break;
    }
  }

  private floatAt(x: number, y: number, text: string) {
    const f = this.floats.find((item) => !item.active);
    if (!f) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.text = text;
    f.life = 0.8;
  }

  private stepParticles(dt: number) {
    for (const p of this.parts) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= dt * 2;
      if (p.life <= 0) p.active = false;
    }
    for (const f of this.floats) {
      if (!f.active) continue;
      f.life -= dt;
      f.y += dt * 0.7;
      if (f.life <= 0) f.active = false;
    }
  }

  private groundY() {
    return this.h * 0.76;
  }

  private draw(frameDt: number) {
    const ctx = this.ctx;
    const { w, h, ppm } = this;
    const groundY = this.groundY();
    let cam = this.camX;
    if (this.phase === "menu") cam = this.attract % 90;
    else if (this.phase === "play" || this.phase === "pause") cam = this.worldX - this.viewM * 0.24;
    else {
      const target = this.boatX - this.viewM * 0.58;
      const k = 1 - Math.exp(-3.4 * Math.max(frameDt, 0.016));
      cam = this.camX + (target - this.camX) * k;
    }
    this.camX = cam;

    let shakeX = 0;
    let shakeY = 0;
    if (!this.reduce && this.trauma > 0) {
      const s = this.trauma * this.trauma;
      const t = this.clock * 40;
      shakeX = (Math.sin(t * 1.7) * 0.5 + Math.sin(t * 3.1) * 0.5) * 16 * s;
      shakeY = (Math.cos(t * 2.3) * 0.5) * 10 * s;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(shakeX, shakeY);
    ctx.imageSmoothingEnabled = true;

    this.blit(this.art.sky, cam, 0.05, 0, h);
    this.blit(this.art.peaks, cam, 0.12, h * 0.04, h * 0.42);
    this.blit(this.art.cliffs, cam, 0.28, h * 0.1, h * 0.52);
    const waterTop = h * 0.5;
    this.blit(this.art.water, cam, 0.46, waterTop, groundY - waterTop + 28);
    this.blit(this.art.trees, cam, 0.68, groundY - h * 0.34, h * 0.36);

    this.drawGround(cam, ppm, groundY);
    this.drawGulls(cam, ppm, groundY);

    if (this.phase !== "menu") {
      this.drawSprite(this.art.dock, this.boatX - 2.6, -0.35, 5.2, cam, ppm, groundY);
      const bob = Math.sin(this.clock * 1.7) * 4;
      this.drawSprite(this.art.boat, this.boatX + 1.4, -0.45, 4.6, cam, ppm, groundY + bob);
      for (const ent of this.ents) {
        if (!ent.alive && (ent.kind === "berry" || ent.kind === "token" || ent.kind === "postcard"))
          continue;
        if (ent.x + ent.w < cam - 2 || ent.x > cam + this.viewM + 3) continue;
        if (ent.kind === "gap") continue;
        const spec = DRAW[ent.kind];
        const img = this.art[ent.kind === "berry" ? "berries" : ent.kind];
        const bobY =
          ent.kind === "berry" || ent.kind === "token" || ent.kind === "postcard"
            ? Math.sin(this.clock * 3 + ent.x) * 0.06
            : 0;
        this.drawSprite(img, ent.x + ent.w / 2, spec.lift + bobY, spec.w, cam, ppm, groundY);
      }
    } else {
      const boatWorld = (this.attract * 0.35) % 90;
      this.drawSprite(this.art.boat, boatWorld, -0.35, 3.6, cam, ppm, groundY + Math.sin(this.clock) * 4);
    }

    this.drawHero(cam, ppm, groundY);
    this.drawFx(cam, ppm, groundY);

    ctx.restore();

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(244, 239, 230, ${Math.min(0.35, this.flash * 2)})`;
      ctx.fillRect(0, 0, w, h);
    }

    const vignette = ctx.createRadialGradient(w * 0.5, h * 0.55, w * 0.28, w * 0.5, h * 0.5, w * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(6, 14, 16, 0.35)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  private blit(img: HTMLImageElement, cam: number, speed: number, y: number, destH: number) {
    if (!img.naturalWidth || destH <= 1) return;
    const ctx = this.ctx;
    const dw = img.naturalWidth * (destH / img.naturalHeight);
    if (dw < 8) return;
    const shift = (((cam * this.ppm * speed) % dw) + dw) % dw;
    for (let sx = -shift; sx < this.w + dw; sx += dw) {
      ctx.drawImage(img, sx, y, dw + 1, destH);
    }
  }

  private drawGround(cam: number, ppm: number, groundY: number) {
    const ctx = this.ctx;
    const x0 = cam - 1;
    const x1 = cam + this.viewM + 2;
    const below = ctx.createLinearGradient(0, groundY, 0, this.h);
    below.addColorStop(0, "#1c3330");
    below.addColorStop(1, "#0c1614");
    ctx.fillStyle = below;
    ctx.fillRect(0, groundY + 8, this.w, this.h - groundY);

    for (const deco of this.decos) {
      if (deco.x < x0 || deco.x > x1) continue;
      const sx = (deco.x - cam) * ppm;
      if (deco.kind === "pool" && deco.x < 190) {
        ctx.fillStyle = "rgba(18, 52, 58, 0.85)";
        ctx.beginPath();
        ctx.ellipse(sx, groundY + 28, deco.w * ppm * 0.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (deco.kind === "tuft") {
        ctx.fillStyle = deco.x < 180 ? "#3f6a45" : "#2f4a34";
        ctx.fillRect(sx, groundY + 10, deco.w * ppm, 8);
      }
    }

    const plank = 0.78;
    for (let x = Math.floor(x0 / plank) * plank; x < x1; x += plank) {
      const sx = (x - cam) * ppm;
      const sw = plank * ppm + 1;
      const biome = x < 170 ? 0 : x < 330 ? 1 : 2;
      const gapped = this.ents.some(
        (ent) => ent.kind === "gap" && x + plank * 0.5 > ent.x && x + plank * 0.5 < ent.x + ent.w,
      );
      if (gapped && biome === 0) {
        ctx.fillStyle = "#12343c";
        ctx.fillRect(sx, groundY - 2, sw, 26);
        continue;
      }
      if (biome === 0) {
        const alt = Math.floor(x / plank) % 2;
        ctx.fillStyle = alt ? "#b08960" : "#c9a57a";
        ctx.fillRect(sx, groundY, sw, 14);
        ctx.fillStyle = "rgba(70, 42, 22, 0.28)";
        ctx.fillRect(sx, groundY, 2, 14);
        if (Math.floor(x / plank) % 4 === 0) {
          ctx.fillStyle = "#6d4a32";
          ctx.fillRect(sx + sw * 0.35, groundY + 12, 7, 26);
        }
      } else if (biome === 1) {
        ctx.fillStyle = Math.floor(x / plank) % 2 ? "#6d5644" : "#7c6450";
        ctx.fillRect(sx, groundY, sw, 16);
        ctx.fillStyle = "#3e6a40";
        ctx.fillRect(sx + 4, groundY + 14, sw * 0.3, 6);
      } else {
        ctx.fillStyle = Math.floor(x / plank) % 2 ? "#b7b2a8" : "#c8c2b6";
        ctx.fillRect(sx, groundY, sw, 14);
        ctx.fillStyle = "#8e8880";
        ctx.beginPath();
        ctx.ellipse(sx + sw * 0.4, groundY + 18, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "rgba(255, 236, 210, 0.35)";
    ctx.fillRect(0, groundY, this.w, 2);
  }

  private drawGulls(cam: number, ppm: number, groundY: number) {
    const img = this.art.gull;
    if (!img.naturalWidth) return;
    for (let i = 0; i < 3; i++) {
      const cycle = ((this.clock * (18 + i * 6) + i * 140) % (this.w + 180)) - 40;
      const dw = 70 + i * 16;
      const dh = dw * (img.naturalHeight / img.naturalWidth);
      const gy = groundY - this.h * (0.32 + i * 0.07) + Math.sin(this.clock * 1.2 + i) * 12;
      this.ctx.drawImage(img, cycle, gy, dw, dh);
    }
  }

  private drawSprite(
    img: HTMLImageElement,
    worldX: number,
    lift: number,
    metersW: number,
    cam: number,
    ppm: number,
    groundY: number,
  ) {
    if (!img.naturalWidth || !img.naturalHeight) return;
    const dw = metersW * ppm;
    const dh = dw * (img.naturalHeight / img.naturalWidth);
    const sx = (worldX - cam) * ppm - dw / 2;
    const sy = groundY - lift * ppm - dh;
    this.ctx.drawImage(img, sx, sy, dw, dh);
  }

  private drawHero(cam: number, ppm: number, groundY: number) {
    const ctx = this.ctx;
    const ducking = (this.duckHeld || this.duckT > 0) && this.onGround && this.stumble <= 0;
    let frame: HTMLImageElement;
    if (this.stumble > 0) frame = this.art.jump1;
    else if (!this.onGround || this.phase === "board") {
      if (this.jumpT > 0) frame = this.art.jump1;
      else if (this.vy > 3.2) frame = this.art.jump2;
      else if (this.vy > -1.2) frame = this.art.jump3;
      else frame = this.art.jump4;
    } else if (ducking) {
      if (this.duckT < 0.08) frame = this.art.duck1;
      else if (!this.duckHeld) frame = this.art.duck4;
      else frame = Math.floor(this.duckT * 8) % 2 === 0 ? this.art.duck2 : this.art.duck3;
    } else {
      const names: ArtName[] = ["run1", "run2", "run3", "run4"];
      frame = this.art[names[Math.floor(this.anim * 8) % 4]];
    }
    if (!frame.naturalWidth) return;

    const dh = 2.2 * ppm;
    const dw = dh;
    let hx = this.viewM * 0.24;
    if (this.phase === "board" || this.phase === "win") {
      const boatM = this.boatX - cam - 1.15;
      const u = Math.min(1, this.boardT / 1.15);
      const ease = 1 - (1 - u) * (1 - u);
      hx = hx + (boatM - hx) * ease;
    }
    const px = hx * ppm;
    const foot = groundY - this.y * ppm;
    let sx = 1;
    let sy = 1;
    if (!this.reduce) {
      if (!this.onGround) {
        sy = 1 + Math.max(-0.16, Math.min(0.16, -this.vy * 0.018));
        sx = 1 / sy;
      } else if (this.landT > 0) {
        const k = this.landT / 0.12;
        sy = 1 - 0.16 * k;
        sx = 1 / sy;
      }
    }
    const rot = this.stumble > 0 ? Math.sin(this.stumble * 28) * 0.18 : 0;
    const shadowW = 22 * (ppm / 60) * (1 - Math.min(0.7, this.y / 2));
    ctx.fillStyle = "rgba(8, 16, 16, 0.35)";
    ctx.beginPath();
    ctx.ellipse(px, groundY + 2, Math.max(6, shadowW), 6 * (ppm / 60), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(px, foot);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    ctx.drawImage(frame, -dw / 2, -dh, dw, dh);
    ctx.restore();
  }

  private drawFx(cam: number, ppm: number, groundY: number) {
    const ctx = this.ctx;
    for (const p of this.parts) {
      if (!p.active) continue;
      const sx = (p.x - cam) * ppm;
      const sy = groundY - p.y * ppm;
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = `600 ${Math.max(14, ppm * 0.28)}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    for (const f of this.floats) {
      if (!f.active) continue;
      ctx.globalAlpha = Math.max(0, f.life / 0.8);
      ctx.fillStyle = "#f4efe6";
      ctx.fillText(f.text, (f.x - cam) * ppm, groundY - f.y * ppm);
      ctx.globalAlpha = 1;
    }
  }
}
