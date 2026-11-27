import {
  playClack,
  playClick,
  playGutter,
  playSpare,
  playStrike,
  setMuted,
  startRoll,
  stopRoll,
  unlockAudio,
} from "./audio";
import {
  BALL_Z,
  createWorld,
  freshPins,
  launch,
  countStanding,
  step,
  type World,
} from "./physics";
import {
  applyDelivery,
  blurb,
  confirmedTotal,
  countMarks,
  cumulative,
  emptyMatch,
  type Action,
  type Match,
  type Roll,
} from "./scoring";
import { loadSave, writeSave, type SaveData } from "./save";

export type Phase = "attract" | "aim" | "meter" | "roll" | "gap" | "setter" | "over";

export type Snap = {
  phase: Phase;
  frameIndex: number;
  rolls: Roll[][];
  cumul: (number | null)[];
  total: number | null;
  pending: boolean;
  standing: number;
  rackFull: boolean;
  ballNumber: number;
  callout: string | null;
  calloutSub: string | null;
  calloutKey: number;
  spin: number;
  best: number;
  strings: number;
  soundOn: boolean;
  guideOn: boolean;
  shakeOn: boolean;
  strikes: number;
  spares: number;
  finalScore: number;
  blurb: string;
  newBest: boolean;
  rulesOpen: boolean;
  metering: boolean;
  stance: number;
  target: number;
  power: number;
};

const BAND_LO = 0.74;
const BAND_HI = 0.93;

function controlCode(event: KeyboardEvent): string {
  if (event.code && event.code !== "Unidentified") return event.code;
  const key = event.key;
  if (key === " " || key === "Spacebar" || key === "Space") return "Space";
  if (key === "Enter") return "Enter";
  if (key === "Escape") return "Escape";
  if (key === "ArrowLeft" || key === "Left") return "ArrowLeft";
  if (key === "ArrowRight" || key === "Right") return "ArrowRight";
  if (key === "ArrowUp" || key === "Up") return "ArrowUp";
  if (key === "ArrowDown" || key === "Down") return "ArrowDown";
  if (key === "a" || key === "A") return "KeyA";
  if (key === "d" || key === "D") return "KeyD";
  if (key === "j" || key === "J") return "KeyJ";
  if (key === "l" || key === "L") return "KeyL";
  if (key === "q" || key === "Q") return "KeyQ";
  if (key === "e" || key === "E") return "KeyE";
  return "";
}

export class AlleySim {
  world: World = createWorld();
  match: Match = emptyMatch();
  phase: Phase = "attract";
  stance = 0;
  target = 0;
  spin = 0;
  power = 0.85;
  meterT = 0;
  time = 0;
  setter = 0;
  setterSwapped = false;
  gapT = 0;
  gapNext: Phase = "aim";
  pendingAction: Action = "keep";
  callout: string | null = null;
  calloutSub: string | null = null;
  calloutT = 0;
  calloutKey = 0;
  rulesOpen = false;
  save: SaveData = loadSave();
  reduceMotion = false;
  newBest = false;
  finalScore = 0;
  rev = 1;
  /** True while a finger is drawing the ball back. Keyboard meter leaves this false. */
  pulling = false;
  pullVisual: { nx: number; ny: number } | null = null;
  private keys = new Set<string>();
  private heardGutter = false;
  private shotStartStanding = 10;
  private consumed = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    setMuted(!this.save.sound);
    this.poseBall(0);
  }

  snapshot(): Snap {
    const cumul = cumulative(this.match.rolls);
    const total = confirmedTotal(cumul);
    const marks = countMarks(this.match.rolls);
    const thrown = this.match.rolls[this.match.frameIndex]?.length ?? 0;
    const pending =
      this.match.rolls.some((frame, index) => frame.length > 0 && cumul[index] === null) &&
      total !== null;
    return {
      phase: this.phase,
      frameIndex: this.match.over ? 9 : this.match.frameIndex,
      rolls: this.match.rolls.map((frame) => frame.map((roll) => ({ ...roll }))),
      cumul,
      total,
      pending,
      standing: countStanding(this.world),
      rackFull: this.match.rackFull,
      ballNumber: Math.min(3, thrown + 1),
      callout: this.callout,
      calloutSub: this.calloutSub,
      calloutKey: this.calloutKey,
      spin: this.spin,
      best: this.save.best,
      strings: this.save.strings,
      soundOn: this.save.sound,
      guideOn: this.save.guide,
      shakeOn: this.save.shake && !this.reduceMotion,
      strikes: marks.strikes,
      spares: marks.spares,
      finalScore: this.finalScore,
      blurb: blurb(this.finalScore),
      newBest: this.newBest,
      rulesOpen: this.rulesOpen,
      metering: this.phase === "meter",
      stance: this.stance,
      target: this.target,
      power: this.phase === "meter" ? this.power : 0.85,
    };
  }

  private bump(): void {
    this.rev += 1;
  }

  private poseBall(x: number): void {
    this.world.ball = {
      x,
      z: BALL_Z,
      vx: 0,
      vz: 0,
      spin: this.spin,
      spinVisual: this.time,
      active: false,
      gutter: false,
      hidden: false,
    };
    this.world.phase = "idle";
  }

  start(): void {
    unlockAudio();
    playClick();
    this.match = emptyMatch();
    this.world = createWorld(freshPins());
    this.stance = 0;
    this.target = 0;
    this.spin = 0;
    this.phase = "aim";
    this.callout = null;
    this.calloutSub = null;
    this.newBest = false;
    this.finalScore = 0;
    this.rulesOpen = false;
    this.setter = 0;
    this.poseBall(0);
    this.bump();
  }

  backToDesk(): void {
    this.phase = "attract";
    this.rulesOpen = false;
    this.callout = null;
    this.world = createWorld(freshPins());
    this.poseBall(0);
    this.bump();
  }

  toggleRules(): void {
    this.rulesOpen = !this.rulesOpen;
    playClick();
    this.bump();
  }

  toggleSound(): void {
    this.save = writeSave({ sound: !this.save.sound });
    setMuted(!this.save.sound);
    if (this.save.sound) {
      unlockAudio();
      playClick();
    }
    this.bump();
  }

  toggleGuide(): void {
    this.save = writeSave({ guide: !this.save.guide });
    playClick();
    this.bump();
  }

  toggleShake(): void {
    this.save = writeSave({ shake: !this.save.shake });
    playClick();
    this.bump();
  }

  setSpin(spin: number): void {
    if (this.phase !== "aim" && this.phase !== "meter") return;
    const next = clamp(spin, -1, 1);
    if (Math.abs(next - this.spin) < 0.05) return;
    this.spin = next;
    this.bump();
  }

  nudgeStance(dir: number): void {
    if (this.phase !== "aim" && this.phase !== "meter") return;
    this.stance = clamp(this.stance + dir, -15, 15);
    this.poseIfWaiting();
    this.bump();
  }

  nudgeTarget(dir: number): void {
    if (this.phase !== "aim" && this.phase !== "meter") return;
    this.target = clamp(this.target + dir, -19, 19);
    this.bump();
  }

  setStance(x: number): void {
    if (this.phase !== "aim" && this.phase !== "meter") return;
    this.stance = clamp(x, -15, 15);
    this.poseIfWaiting();
  }

  setTarget(x: number): void {
    if (this.phase !== "aim" && this.phase !== "meter") return;
    this.target = clamp(x, -19, 19);
  }

  private poseIfWaiting(): void {
    if (this.phase === "aim" || this.phase === "attract") this.poseBall(this.stance);
    else if (this.phase === "meter" && this.world.ball) this.world.ball.x = this.stance;
  }

  beginMeter(): void {
    if (this.phase !== "aim" || this.rulesOpen) return;
    unlockAudio();
    this.pulling = false;
    this.pullVisual = null;
    this.phase = "meter";
    this.meterT = 0;
    this.power = 0;
    this.bump();
  }

  /** Finger backswing. Power is how far the ball was drawn back, not a timing bar. */
  setPull(power: number, visual: { nx: number; ny: number }): void {
    if (this.rulesOpen) return;
    if (this.phase !== "aim" && !(this.phase === "meter" && this.pulling)) return;
    if (this.phase === "aim") {
      unlockAudio();
      this.phase = "meter";
      this.meterT = 0;
      this.bump();
    }
    this.pulling = true;
    this.power = clamp(power, 0, 1);
    this.pullVisual = visual;
  }

  cancelPull(): void {
    this.pullVisual = null;
    if (!this.pulling) return;
    this.pulling = false;
    if (this.phase === "meter") {
      this.phase = "aim";
      this.power = 0.85;
      this.poseIfWaiting();
      this.bump();
    }
  }

  release(): void {
    if (this.phase !== "meter") return;
    const fromPull = this.pulling;
    this.pulling = false;
    this.pullVisual = null;
    const firm = this.power >= BAND_LO && this.power <= BAND_HI;
    const shotPower = fromPull ? this.power : firm ? Math.max(this.power, 0.82) : this.power;
    this.shotStartStanding = countStanding(this.world);
    this.heardGutter = false;
    this.consumed = false;
    this.world.trauma = 0.08;
    launch(this.world, this.stance, this.target, shotPower, this.spin);
    startRoll();
    this.phase = "roll";
    this.bump();
  }

  keyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const code = controlCode(event);
    if (!code) return;
    this.keys.add(code);
    if (
      code === "Space" ||
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "ArrowUp" ||
      code === "ArrowDown"
    ) {
      event.preventDefault();
    }
    if (code === "Space" || code === "Enter") {
      event.preventDefault();
      if (this.rulesOpen) return;
      if (this.phase === "attract" || this.phase === "over") this.start();
      else if (this.phase === "aim") this.beginMeter();
    }
    if (code === "Escape" && this.rulesOpen) this.toggleRules();
  }

  keyUp(event: KeyboardEvent): void {
    const code = controlCode(event);
    this.keys.delete(code);
    if ((code === "Space" || code === "Enter") && this.phase === "meter") this.release();
  }

  private applyHeld(dt: number): void {
    if (this.phase !== "aim" && this.phase !== "meter") return;
    const stepIn = 26 * dt;
    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) this.stance -= stepIn;
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) this.stance += stepIn;
    if (this.keys.has("KeyJ")) this.target -= stepIn;
    if (this.keys.has("KeyL")) this.target += stepIn;
    if (this.keys.has("KeyQ")) this.spin -= dt * 0.9;
    if (this.keys.has("KeyE")) this.spin += dt * 0.9;
    this.stance = clamp(this.stance, -15, 15);
    this.target = clamp(this.target, -19, 19);
    this.spin = clamp(this.spin, -1, 1);
    if (this.keys.has("KeyQ") || this.keys.has("KeyE")) this.bump();
    if (this.phase === "aim") this.poseBall(this.stance);
    else if (this.phase === "meter" && this.world.ball) this.world.ball.x = this.stance;
  }

  tick(dt: number): void {
    this.time += dt;
    this.world.trauma = Math.max(0, this.world.trauma - dt * 1.55);
    this.applyHeld(dt);

    if (this.phase === "attract") {
      const sway = this.reduceMotion ? 0 : Math.sin(this.time * 0.8) * 5.5;
      this.poseBall(sway);
      return;
    }

    if (this.phase === "meter" && !this.pulling) {
      this.meterT += dt;
      const period = 1.15;
      const u = (this.meterT % period) / period;
      this.power = u < 0.5 ? u * 2 : 2 - u * 2;
    }

    if (this.phase === "roll" || this.phase === "gap" || this.phase === "setter") {
      if (this.phase === "roll" || (this.phase === "gap" && this.world.phase !== "done" && this.world.phase !== "idle")) {
        step(this.world, dt);
      }
      this.drainAudio();
      if (this.phase === "roll" && this.world.phase === "done" && !this.consumed) {
        this.consumed = true;
        this.finishShot();
      }
    }

    if (this.phase === "gap") {
      this.gapT -= dt;
      if (this.gapT <= 0) this.leaveGap();
    }

    if (this.phase === "setter") {
      const dur = this.reduceMotion ? 0.45 : 1.05;
      this.setter += dt / dur;
      if (!this.setterSwapped && this.setter >= 0.48) {
        this.world.pins = freshPins();
        this.world.particles = [];
        this.setterSwapped = true;
      }
      if (this.setter >= 1) {
        this.setter = 0;
        this.phase = "aim";
        this.poseBall(this.stance);
        this.bump();
      }
    }

    if (this.calloutT > 0) {
      this.calloutT -= dt;
      if (this.calloutT <= 0) {
        this.callout = null;
        this.calloutSub = null;
        this.bump();
      }
    }
  }

  private drainAudio(): void {
    let clacks = 0;
    let loudest = 0;
    for (const event of this.world.events) {
      if (event.kind === "clack") {
        clacks += 1;
        loudest = Math.max(loudest, event.power);
      } else if (event.kind === "gutter" && !this.heardGutter) {
        this.heardGutter = true;
        playGutter();
      } else if (event.kind === "multi") {
        clacks += 1;
        loudest = Math.max(loudest, 0.8);
      }
    }
    this.world.events = [];
    const budget = Math.min(3, clacks);
    for (let i = 0; i < budget; i++) playClack(loudest * (1 - i * 0.18));
  }

  private finishShot(): void {
    stopRoll();
    const standing = countStanding(this.world);
    const knocked = Math.max(0, this.shotStartStanding - standing);
    const gutter = this.world.ball?.gutter ?? false;
    const before = this.match;
    const result = applyDelivery(before, knocked, standing, this.shotStartStanding, gutter);
    this.match = result.match;
    this.pendingAction = result.action;
    const assist = this.world.woodTipped.some((id) => !this.world.ballTouched.includes(id));
    const rollIndex = before.rolls[before.frameIndex]?.length ?? 0;
    const thirdClear =
      !result.roll.isStrike && !result.roll.isSpare && standing === 0 && rollIndex >= 2;
    const copy = calloutCopy(result.roll, standing, assist, thirdClear);
    this.callout = copy.title;
    this.calloutSub = copy.sub;
    this.calloutT = result.roll.isStrike ? 1.35 : 1.15;
    this.calloutKey += 1;
    if (result.roll.isStrike) {
      playStrike();
      this.world.trauma = Math.min(1, this.world.trauma + 0.55);
    } else if (result.roll.isSpare) playSpare();
    if (this.world.ball) this.world.ball.hidden = true;
    this.phase = "gap";
    this.gapT = this.reduceMotion ? 0.45 : result.roll.isStrike ? 1.15 : 0.85;
    this.gapNext = result.action === "keep" ? "aim" : result.action === "over" ? "over" : "setter";
    this.bump();
  }

  private leaveGap(): void {
    if (this.gapNext === "aim") {
      this.phase = "aim";
      this.poseBall(this.stance);
      this.bump();
      return;
    }
    if (this.gapNext === "over") {
      const cumul = cumulative(this.match.rolls);
      const score = cumul[9] ?? confirmedTotal(cumul) ?? 0;
      this.finalScore = score;
      this.newBest = score > this.save.best;
      this.save = writeSave({
        best: Math.max(this.save.best, score),
        strings: this.save.strings + 1,
      });
      this.phase = "over";
      this.bump();
      return;
    }
    this.phase = "setter";
    this.setter = 0;
    this.setterSwapped = false;
    this.bump();
  }
}

function calloutCopy(
  roll: Roll,
  standing: number,
  assist: boolean,
  thirdClear: boolean,
): { title: string; sub: string } {
  if (roll.isStrike) return { title: "Strike", sub: "All ten on the first ball." };
  if (roll.isSpare) return { title: "Spare", sub: "The second ball finished it." };
  if (thirdClear) return { title: "Cleared", sub: "All down. The third ball pays no bonus." };
  if (roll.gutter) return { title: "Channel", sub: "That one found the gutter." };
  if (assist && roll.pins > 0) return { title: "Deadwood", sub: "The fallen wood knocked one in." };
  if (roll.pins === 0) return { title: "Still standing", sub: "They wobbled, then stayed." };
  if (roll.pins === 1) return { title: "One down", sub: `${standing} still on the lane.` };
  return { title: `${roll.pins} down`, sub: `${standing} still standing.` };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const POWER_BAND = { lo: BAND_LO, hi: BAND_HI };
