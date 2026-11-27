import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Beef, ChefHat, Flame, Pause, Play as PlayIcon, RotateCcw, Timer, Volume2, VolumeX } from "lucide-react";
import { loadArt, type Art } from "@/game/art";
import { resumeAudio, setSoundEnabled, sfx, unlockAudio } from "@/game/audio";
import { draw } from "@/game/draw";
import {
  STEP_META,
  createSim,
  doughPointerDown,
  doughPointerUp,
  goNext,
  houseSauce,
  lockDough,
  money,
  pullOven,
  sauceAdd,
  sauceEnd,
  sauceStart,
  sendPizza,
  shakeCheese,
  slapMeat,
  snapshot,
  sprinkleCheese,
  startShift,
  tick,
  tossGarden,
  type Pt,
  type Sim,
  type Snapshot,
} from "@/game/logic";
import { loadSave, writeSave, type SaveData } from "@/game/save";

const HOW = [
  "Stretch the dough until it sits in the gold ring.",
  "Lay on the spiced donair meat, edge to edge.",
  "Blanket it with mozzarella.",
  "Tomato and sweet onion, both of them.",
  "Bake, and pull while the bar is gold.",
  "Zigzag the sweet sauce. Send it out.",
];

function formatTime(seconds: number) {
  const t = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hudKey(s: Snapshot) {
  return [
    s.phase,
    s.paused ? 1 : 0,
    s.step,
    Math.ceil(s.timeLeft),
    s.pizzas,
    s.combo,
    Math.round(s.tips * 10),
    Math.round(s.doughStretch * 20),
    s.doughSet ? 1 : 0,
    s.doughGood ? 1 : 0,
    s.meatCount,
    Math.round(s.cheeseScore / 4),
    s.tomato,
    s.onion,
    Math.round(s.bake * 24),
    s.bakeSet ? 1 : 0,
    Math.round(s.sauceScore / 4),
    s.banner,
    s.busy ? 1 : 0,
    s.grades.length,
  ].join("|");
}

function relPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number): Pt {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const radius = Math.min(rect.width, rect.height) * 0.4;
  return { x: (x - cx) / radius, y: (y - cy) / radius };
}

const recordedShifts = new Set<number>();

export function DonairRush() {
  const simRef = useRef<Sim>(createSim(1));
  const artRef = useRef<Art>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const keyRef = useRef("");
  const holdStart = useRef(0);
  const gardenKind = useRef<"tomato" | "onion">("tomato");
  const cheeseDrag = useRef(false);
  const lastCheese = useRef<Pt | null>(null);
  const actions = useRef({
    down: () => {},
    up: () => {},
    pause: () => {},
    enter: () => {},
  });

  const [snap, setSnap] = useState<Snapshot>(() => snapshot(simRef.current));
  const [save, setSave] = useState<SaveData>(() => ({
    version: 1,
    bestPizzas: 0,
    bestTips: 0,
    bestCombo: 0,
    shifts: 0,
    sound: true,
    shake: true,
  }));
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [shakeOn, setShakeOn] = useState(true);
  const [isBest, setIsBest] = useState(false);
  const [garden, setGarden] = useState<"tomato" | "onion">("tomato");

  const sync = () => {
    const next = snapshot(simRef.current);
    keyRef.current = hudKey(next);
    setSnap(next);
  };

  useEffect(() => {
    const saved = loadSave();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shake = saved.shake && !reduced;
    setSave(saved);
    setSoundOn(saved.sound);
    setShakeOn(shake);
    setSoundEnabled(saved.sound);
    simRef.current.shake = shake;
    simRef.current.reduced = reduced;
    setReady(true);
    return loadArt((art) => {
      artRef.current = art;
    });
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (snap.phase !== "play") return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const sim = simRef.current;
      tick(sim, dt);
      if (sim.events.length) {
        for (const ev of sim.events) sfx(ev);
        sim.events.length = 0;
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (ctx) draw(ctx, sim, artRef.current);
      const stage = stageRef.current;
      if (stage) {
        const mag = sim.shake && !sim.reduced ? sim.trauma * sim.trauma : 0;
        if (mag < 0.015) stage.style.transform = "";
        else {
          const wobble = sim.t * 38;
          const dx = Math.sin(wobble * 1.7) * 8 * mag;
          const dy = Math.cos(wobble * 2.2) * 6 * mag;
          stage.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
        }
      }
      const next = snapshot(sim);
      const key = hudKey(next);
      if (key !== keyRef.current) {
        keyRef.current = key;
        setSnap(next);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [snap.phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || snap.phase !== "play") return;
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [snap.phase]);

  useEffect(() => {
    if (!ready || snap.phase !== "results" || !snap.result) return;
    const sim = simRef.current;
    if (!sim.id || recordedShifts.has(sim.id)) return;
    recordedShifts.add(sim.id);
    const result = snap.result;
    setSave((prev) => {
      const betterPizzas = result.pizzas > prev.bestPizzas;
      const tieTips = result.pizzas === prev.bestPizzas && result.tips > prev.bestTips;
      const best = (betterPizzas || tieTips) && result.pizzas > 0;
      const next: SaveData = {
        ...prev,
        shifts: prev.shifts + 1,
        bestCombo: Math.max(prev.bestCombo, result.bestCombo),
        bestPizzas: best ? result.pizzas : prev.bestPizzas,
        bestTips: best ? result.tips : prev.bestTips,
      };
      writeSave(next);
      setIsBest(best);
      return next;
    });
  }, [ready, snap.phase, snap.result]);

  const begin = () => {
    unlockAudio();
    setIsBest(false);
    startShift(simRef.current);
    simRef.current.shake = shakeOn;
    sync();
  };

  const toggleSound = () => {
    unlockAudio();
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    setSave((prev) => {
      const data = { ...prev, sound: next };
      writeSave(data);
      return data;
    });
  };

  const toggleShake = () => {
    const next = !shakeOn;
    setShakeOn(next);
    simRef.current.shake = next;
    setSave((prev) => {
      const data = { ...prev, shake: next };
      writeSave(data);
      return data;
    });
  };

  const togglePause = () => {
    const sim = simRef.current;
    if (sim.phase !== "play") return;
    sim.paused = !sim.paused;
    sim.doughHolding = false;
    sync();
  };

  const leaveShift = () => {
    simRef.current.phase = "menu";
    simRef.current.paused = false;
    sync();
  };

  actions.current.down = () => {
    const sim = simRef.current;
    if (sim.phase !== "play" || sim.paused) return;
    holdStart.current = performance.now();
    if (sim.step === "dough") doughPointerDown(sim);
    else if (sim.step === "meat") slapMeat(sim);
    else if (sim.step === "cheese") shakeCheese(sim);
    else if (sim.step === "garden") {
      gardenKind.current = "tomato";
      setGarden("tomato");
      tossGarden(sim, "tomato");
    } else if (sim.step === "oven") pullOven(sim);
    else if (sim.step === "sauce") houseSauce(sim);
    sync();
  };
  actions.current.up = () => {
    const sim = simRef.current;
    if (sim.step === "dough") {
      const held = (performance.now() - holdStart.current) / 1000;
      doughPointerUp(sim, held);
      sync();
    }
  };
  actions.current.pause = togglePause;
  actions.current.enter = () => {
    const sim = simRef.current;
    if (sim.phase !== "play" || sim.paused || sim.delay > 0) return;
    if (sim.step === "sauce") sendPizza(sim);
    else if (sim.step !== "dough" && sim.step !== "oven") goNext(sim);
    sync();
  };

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space") {
        if (simRef.current.phase === "play") {
          e.preventDefault();
          unlockAudio();
          actions.current.down();
        }
      } else if (e.code === "Escape") actions.current.pause();
      else if (e.code === "Enter") actions.current.enter();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") actions.current.up();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const onCanvasDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (snap.paused) return;
    unlockAudio();
    e.currentTarget.setPointerCapture(e.pointerId);
    const sim = simRef.current;
    const p = relPoint(e.currentTarget, e.clientX, e.clientY);
    holdStart.current = performance.now();
    if (sim.step === "dough") doughPointerDown(sim);
    else if (sim.step === "meat" && Math.hypot(p.x, p.y) < 1.2) slapMeat(sim, p);
    else if (sim.step === "cheese") {
      cheeseDrag.current = true;
      lastCheese.current = p;
      sprinkleCheese(sim, p);
    } else if (sim.step === "garden" && Math.hypot(p.x, p.y) < 1.2) {
      tossGarden(sim, gardenKind.current, p);
    } else if (sim.step === "oven") pullOven(sim);
    else if (sim.step === "sauce") sauceStart(sim, p);
    sync();
  };

  const onCanvasMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const sim = simRef.current;
    const p = relPoint(e.currentTarget, e.clientX, e.clientY);
    if (sim.step === "cheese" && cheeseDrag.current) {
      const last = lastCheese.current;
      if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 0.08) {
        sprinkleCheese(sim, p);
        lastCheese.current = p;
        sync();
      }
    } else if (sim.step === "sauce" && sim.saucing) sauceAdd(sim, p);
  };

  const onCanvasUp = () => {
    cheeseDrag.current = false;
    const sim = simRef.current;
    if (sim.step === "dough") {
      const held = (performance.now() - holdStart.current) / 1000;
      doughPointerUp(sim, held);
    }
    sauceEnd(sim);
    sync();
  };

  return (
    <div className="shop-bg relative h-dvh overflow-hidden">
      <div className="shop-scrim absolute inset-0" />
      <div className="relative z-10 flex h-full flex-col">
        {snap.phase === "menu" && (
          <Menu
            save={save}
            soundOn={soundOn}
            onStart={begin}
            onSound={toggleSound}
          />
        )}
        {snap.phase === "play" && (
          <Play
            snap={snap}
            garden={garden}
            stageRef={stageRef}
            canvasRef={canvasRef}
            onCanvasDown={onCanvasDown}
            onCanvasMove={onCanvasMove}
            onCanvasUp={onCanvasUp}
            onPause={togglePause}
            onSound={toggleSound}
            onShake={toggleShake}
            onLeave={leaveShift}
            soundOn={soundOn}
            shakeOn={shakeOn}
            holdStart={holdStart}
            sync={sync}
            getSim={() => simRef.current}
            setGarden={(kind) => {
              gardenKind.current = kind;
              setGarden(kind);
            }}
          />
        )}
        {snap.phase === "results" && snap.result && (
          <Results
            pizzas={snap.result.pizzas}
            tips={snap.result.tips}
            perfects={snap.result.perfects}
            bestCombo={snap.result.bestCombo}
            rank={snap.result.rank}
            isBest={isBest}
            onAgain={begin}
            onMenu={leaveShift}
          />
        )}
      </div>
    </div>
  );
}

function Menu({
  save,
  soundOn,
  onStart,
  onSound,
}: {
  save: SaveData;
  soundOn: boolean;
  onStart: () => void;
  onSound: () => void;
}) {
  return (
    <main className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 overflow-y-auto px-4 py-4 md:flex-row md:items-center md:py-8">
      <section className="panel flex flex-1 flex-col items-center px-5 py-6 text-center md:px-8">
        <p className="text-sm font-semibold tracking-wide text-spice">Halifax · waterfront night shift</p>
        <h1 className="mt-1 font-display text-5xl text-balance text-ink md:text-6xl">Harbour Donair</h1>
        <img
          src="/game/hero.png"
          alt="A finished donair pizza with sweet sauce, meat, tomato, and onion"
          className="mt-3 h-52 w-auto object-contain md:h-64"
        />
        <p className="mt-2 max-w-md text-pretty text-base leading-relaxed text-ink">
          A big order just hit the board. Build as many donair pizzas as you can before the
          crowd reaches the counter.
        </p>
        <button type="button" className="btn btn-red mt-5 w-full max-w-xs" data-testid="start" onClick={onStart}>
          <PlayIcon className="size-5" aria-hidden="true" />
          Start the rush
        </button>
        <p className="mt-3 text-sm tabular-nums text-spice">
          {save.bestPizzas > 0
            ? `Best shift · ${save.bestPizzas} ${save.bestPizzas === 1 ? "pie" : "pies"} · ${money(save.bestTips)}`
            : "No shift on the books yet"}
        </p>
        <button type="button" className="btn btn-ghost mt-2 min-h-11 px-4 text-sm" onClick={onSound}>
          {soundOn ? <Volume2 className="size-4" aria-hidden="true" /> : <VolumeX className="size-4" aria-hidden="true" />}
          {soundOn ? "Sound on" : "Sound off"}
        </button>
      </section>
      <aside className="panel w-full shrink-0 px-5 py-5 md:w-80">
        <div className="flex items-center gap-3">
          <img src="/game/chef.png" alt="" className="size-16 rounded-full object-cover" />
          <div>
            <p className="font-display text-xl text-ink">Rae, night cook</p>
            <p className="text-sm text-pretty text-spice">Gold ring on the dough. Pull before it goes dark.</p>
          </div>
        </div>
        <h2 className="mt-5 font-display text-2xl text-ink">How a donair pizza goes</h2>
        <ol className="mt-3 flex flex-col gap-2">
          {HOW.map((line, i) => (
            <li key={line} className="flex gap-3 text-sm leading-snug text-ink">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-red text-xs font-semibold text-cream">
                {i + 1}
              </span>
              <span className="text-pretty">{line}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-center gap-2 text-sm text-spice">
          <Timer className="size-4" aria-hidden="true" />
          Ninety seconds. Space does the big button.
        </p>
      </aside>
    </main>
  );
}

function Play({
  snap,
  garden,
  stageRef,
  canvasRef,
  onCanvasDown,
  onCanvasMove,
  onCanvasUp,
  onPause,
  onSound,
  onShake,
  onLeave,
  soundOn,
  shakeOn,
  holdStart,
  sync,
  getSim,
  setGarden,
}: {
  snap: Snapshot;
  garden: "tomato" | "onion";
  stageRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onCanvasDown: (e: PointerEvent<HTMLCanvasElement>) => void;
  onCanvasMove: (e: PointerEvent<HTMLCanvasElement>) => void;
  onCanvasUp: () => void;
  onPause: () => void;
  onSound: () => void;
  onShake: () => void;
  onLeave: () => void;
  soundOn: boolean;
  shakeOn: boolean;
  holdStart: RefObject<number>;
  sync: () => void;
  getSim: () => Sim;
  setGarden: (kind: "tomato" | "onion") => void;
}) {
  const stepIndex = STEP_META.findIndex((s) => s.id === snap.step);
  const hint = STEP_META[stepIndex]?.hint ?? "";
  const urgent = snap.timeLeft <= 10;

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-col px-3 py-3 md:max-w-3xl md:py-5">
      <header className="flex items-center justify-between gap-3 text-cream">
        <div>
          <p className="font-display text-xl leading-none md:text-2xl">Harbour Donair</p>
          <p className="mt-1 text-xs text-cream/80">The game-night crowd is on the way</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`rounded-full px-3 py-1.5 text-center tabular-nums ${urgent ? "bg-red text-cream" : "bg-ink/70 text-cream"}`}>
            <p className="text-xs">Crowd in</p>
            <p className="text-lg font-semibold leading-none">{formatTime(snap.timeLeft)}</p>
          </div>
          <button type="button" className="btn btn-ink min-h-11 min-w-11 px-3" onClick={onPause} aria-label="Pause">
            <Pause className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mt-3 flex items-center justify-between gap-2 text-sm text-cream">
        <p className="rounded-full bg-ink/70 px-3 py-1 tabular-nums">
          <span className="font-semibold">{snap.pizzas}</span> {snap.pizzas === 1 ? "pie" : "pies"}
        </p>
        <p className="rounded-full bg-ink/70 px-3 py-1 tabular-nums">{money(snap.tips)} tips</p>
        <p className="rounded-full bg-gold px-3 py-1 font-semibold text-ink tabular-nums">
          {snap.combo >= 2 ? `Combo ×${snap.combo}` : "Combo"}
        </p>
      </div>

      <ol className="mt-3 grid grid-cols-6 gap-1">
        {STEP_META.map((step, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "now" : "later";
          return (
            <li
              key={step.id}
              className={`step-pill grid place-items-center px-1 ${
                state === "now" ? "bg-gold text-ink" : state === "done" ? "bg-red text-cream" : "bg-ink/50 text-cream/80"
              }`}
            >
              {step.label}
            </li>
          );
        })}
      </ol>

      <div ref={stageRef} className="panel relative mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        <div className="pie-slot relative mx-auto shrink-0">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full touch-none"
            data-testid="pie"
            onPointerDown={onCanvasDown}
            onPointerMove={onCanvasMove}
            onPointerUp={onCanvasUp}
            onPointerCancel={onCanvasUp}
          />
          <PieLabel snap={snap} />
          <p className="sr-only" aria-live="polite">
            {snap.banner ? `${snap.banner}. ${snap.bannerSub}` : ""}
          </p>
        </div>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-pretty text-ink">{hint}</p>
        <StepMeter score={snap.stepScore} />
        <div className="mx-auto mt-3 flex w-full max-w-md shrink-0 flex-col gap-2">
          <StepControls
            snap={snap}
            garden={garden}
            holdStart={holdStart}
            sync={sync}
            getSim={getSim}
            setGarden={setGarden}
          />
        </div>
      </div>

      {snap.paused && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-ink/70 px-4">
          <div className="panel w-full max-w-sm px-5 py-6 text-center">
            <h2 className="font-display text-4xl text-ink">Shift paused</h2>
            <p className="mt-1 text-sm text-spice">The oven holds. The crowd does not.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="btn btn-red" data-testid="resume" onClick={onPause}>
                Keep cooking
              </button>
              <button type="button" className="btn btn-ghost" onClick={onSound}>
                {soundOn ? "Sound on" : "Sound off"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onShake}>
                {shakeOn ? "Shake on" : "Shake off"}
              </button>
              <button type="button" className="btn btn-ink" onClick={onLeave}>
                Leave this shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PieLabel({ snap }: { snap: Snapshot }) {
  if (snap.banner) {
    const tone =
      snap.bannerTone === "gold" ? "bg-gold text-ink" : snap.bannerTone === "bad" ? "bg-red text-cream" : "bg-ink text-cream";
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className={`grade-pop rounded-3xl px-5 py-3 text-center shadow-lg ${tone}`}>
          <p className="font-display text-4xl leading-none">{snap.banner}</p>
          <p className="mt-1 text-sm font-semibold">{snap.bannerSub}</p>
        </div>
      </div>
    );
  }
  if (snap.busy) return null;
  let label = "";
  let gold = false;
  if (snap.step === "dough" && !snap.doughSet) {
    if (snap.doughStretch < 0.5) label = "Stretch";
    else if (snap.doughGood) {
      label = "Set it";
      gold = true;
    } else if (snap.doughStretch > 1.08) label = "A bit thin";
    else label = "Almost";
  } else if (snap.step === "oven" && !snap.bakeSet) {
    if (snap.bake < 0.56) label = "Still pale";
    else if (snap.inGold) {
      label = "Pull!";
      gold = true;
    } else label = "Too dark";
  }
  if (!label) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 grid place-items-center">
      <p className={`rounded-full px-4 py-2 text-lg font-semibold ${gold ? "bg-gold text-ink" : "bg-ink/75 text-cream"}`}>
        {label}
      </p>
    </div>
  );
}

function StepMeter({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="mx-auto mt-2 w-full max-w-md">
      <div className="mb-1 flex justify-between text-xs font-semibold text-spice">
        <span>This step</span>
        <span className="tabular-nums">{clamped}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-gold" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function StepControls({
  snap,
  garden,
  holdStart,
  sync,
  getSim,
  setGarden,
}: {
  snap: Snapshot;
  garden: "tomato" | "onion";
  holdStart: RefObject<number>;
  sync: () => void;
  getSim: () => Sim;
  setGarden: (kind: "tomato" | "onion") => void;
}) {
  if (snap.step === "dough") {
    return (
      <>
        <button
          type="button"
          className={`btn ${snap.doughGood ? "btn-gold" : "btn-red"}`}
          data-testid="action-primary"
          disabled={snap.doughSet || snap.busy}
          onPointerDown={(e) => {
            if (snap.doughSet || snap.busy) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            holdStart.current = performance.now();
            unlockAudio();
            doughPointerDown(getSim());
            sync();
          }}
          onPointerUp={() => {
            doughPointerUp(getSim(), (performance.now() - holdStart.current) / 1000);
            sync();
          }}
          onPointerCancel={() => {
            doughPointerUp(getSim(), (performance.now() - holdStart.current) / 1000);
            sync();
          }}
        >
          {snap.doughGood ? "Set the dough" : "Hold to stretch"}
        </button>
        {snap.doughStretch >= 0.55 && !snap.doughGood && !snap.doughSet && (
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="action-set"
            onClick={() => {
              unlockAudio();
              lockDough(getSim());
              sync();
            }}
          >
            Set this size
          </button>
        )}
      </>
    );
  }

  if (snap.step === "meat") {
    return (
      <>
        <button
          type="button"
          className="btn btn-red"
          data-testid="action-primary"
          disabled={snap.busy || snap.meatCount >= 8}
          onClick={() => {
            unlockAudio();
            slapMeat(getSim());
            sync();
          }}
        >
          <Beef className="size-5" aria-hidden="true" />
          Lay a slice · {snap.meatCount}/6
        </button>
        <NextButton
          label="On to the cheese"
          disabled={snap.busy || snap.meatCount < 4}
          testid="action-next"
          onClick={() => {
            goNext(getSim());
            sync();
          }}
        />
      </>
    );
  }

  if (snap.step === "cheese") {
    return (
      <>
        <button
          type="button"
          className="btn btn-red"
          data-testid="action-primary"
          disabled={snap.busy}
          onClick={() => {
            unlockAudio();
            shakeCheese(getSim());
            sync();
          }}
        >
          Shake the cheese
        </button>
        <NextButton
          label="Add the garden"
          disabled={snap.busy || snap.cheeseScore < 45}
          testid="action-next"
          onClick={() => {
            goNext(getSim());
            sync();
          }}
        />
      </>
    );
  }

  if (snap.step === "garden") {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`btn ${garden === "tomato" ? "btn-red" : "btn-ghost"}`}
            data-testid="action-tomato"
            disabled={snap.busy || snap.tomato >= 8}
            onClick={() => {
              unlockAudio();
              setGarden("tomato");
              tossGarden(getSim(), "tomato");
              sync();
            }}
          >
            Tomato · {snap.tomato}/4
          </button>
          <button
            type="button"
            className={`btn ${garden === "onion" ? "btn-gold" : "btn-ghost"}`}
            data-testid="action-onion"
            disabled={snap.busy || snap.onion >= 8}
            onClick={() => {
              unlockAudio();
              setGarden("onion");
              tossGarden(getSim(), "onion");
              sync();
            }}
          >
            Onion · {snap.onion}/4
          </button>
        </div>
        <NextButton
          label="Into the oven"
          disabled={snap.busy || snap.tomato < 2 || snap.onion < 2}
          testid="action-next"
          onClick={() => {
            goNext(getSim());
            sync();
          }}
        />
      </>
    );
  }

  if (snap.step === "oven") {
    return (
      <button
        type="button"
        className={`btn ${snap.inGold ? "btn-gold" : "btn-red"}`}
        data-testid="pull"
        disabled={snap.busy || snap.bakeSet || snap.bake < 0.22}
        onClick={() => {
          unlockAudio();
          pullOven(getSim());
          sync();
        }}
      >
        <Flame className="size-5" aria-hidden="true" />
        {snap.bake < 0.22 ? "Oven's heating" : snap.inGold ? "Pull it — it's gold" : "Pull the pie"}
      </button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <img src="/game/bottle.png" alt="" className="size-14 object-contain" />
        <button
          type="button"
          className="btn btn-red flex-1"
          data-testid="action-primary"
          disabled={snap.busy}
          onClick={() => {
            unlockAudio();
            houseSauce(getSim());
            sync();
          }}
        >
          House zigzag
        </button>
      </div>
      <button
        type="button"
        className="btn btn-gold"
        data-testid="send"
        disabled={snap.busy}
        onClick={() => {
          unlockAudio();
          sendPizza(getSim());
          sync();
        }}
      >
        {snap.sauceScore >= 20 ? "Send it out" : "Send it plain"}
      </button>
    </>
  );
}

function NextButton({
  label,
  disabled,
  onClick,
  testid,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button type="button" className="btn btn-gold" data-testid={testid} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
}

function Results({
  pizzas,
  tips,
  perfects,
  bestCombo,
  rank,
  isBest,
  onAgain,
  onMenu,
}: {
  pizzas: number;
  tips: number;
  perfects: number;
  bestCombo: number;
  rank: string;
  isBest: boolean;
  onAgain: () => void;
  onMenu: () => void;
}) {
  return (
    <main className="grid h-full place-items-center overflow-y-auto px-4 py-6">
      <section className="panel w-full max-w-md px-6 py-7 text-center">
        <p className="text-sm font-semibold text-spice">The crowd is at the door</p>
        <h2 className="mt-1 font-display text-5xl text-balance text-ink">{rank}</h2>
        <p className="mt-3 font-display text-7xl tabular-nums leading-none text-red">{pizzas}</p>
        <p className="text-lg text-ink">{pizzas === 1 ? "donair pizza" : "donair pizzas"}</p>
        {isBest && <p className="mt-2 inline-block rounded-full bg-gold px-3 py-1 text-sm font-semibold text-ink">New best shift</p>}
        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="Perfects" value={String(perfects)} />
          <Stat label="Best combo" value={bestCombo > 1 ? `×${bestCombo}` : "—"} />
          <Stat label="Tip jar" value={money(tips)} />
        </dl>
        <p className="mt-4 text-sm text-pretty text-spice">
          Sweet sauce, pepper, and a harbour wind. Run another shift if the oven's still hot.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" className="btn btn-red" data-testid="again" onClick={onAgain}>
            <RotateCcw className="size-5" aria-hidden="true" />
            Run it back
          </button>
          <button type="button" className="btn btn-ghost" onClick={onMenu}>
            <ChefHat className="size-5" aria-hidden="true" />
            Back to the shop
          </button>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink/5 px-2 py-3">
      <dt className="text-xs text-spice">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
