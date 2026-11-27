import { useEffect, useRef, useState, type HTMLAttributes, type PointerEvent } from "react";
import { Coffee, Mountain, Volume2, VolumeX } from "lucide-react";
import dawnArt from "@/assets/art/dawn.jpg";
import louiseArt from "@/assets/art/louise.jpg";
import moraineArt from "@/assets/art/moraine.jpg";
import { Sfx } from "@/game/audio";
import { drawWorld, updateCamera } from "@/game/draw";
import { createSim, formatClock, openCount, stepSim } from "@/game/sim";
import type { Actions, Breakdown, LakeId, Sim } from "@/game/types";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys?: (codes: string[]) => void;
      getState?: () => {
        x: number;
        y: number;
        yaw: number;
        speed: number;
        phase: string;
        strikes: number;
        open: number;
        fail: string;
        message: string;
        pass: boolean;
        clock: number;
      } | null;
    };
  }
}

const BEST_KEY = "parking-scramble-best-v1";

type TouchState = { left: boolean; right: boolean; gas: boolean; brake: boolean; honk: boolean };

type Snap = {
  phase: Sim["phase"];
  paused: boolean;
  lake: LakeId;
  clock: string;
  gate: number;
  open: number;
  strikes: number;
  hasPass: boolean;
  hasCoffee: boolean;
  message: string;
  hint: string;
  breakdown: Breakdown | null;
  failTitle: string;
  failDetail: string;
  best: number;
  lakeside: boolean;
  lastStall: boolean;
};

const emptyTouch = (): TouchState => ({ left: false, right: false, gas: false, brake: false, honk: false });

function titleSnap(best: number, lake: LakeId): Snap {
  return {
    phase: "title",
    paused: false,
    lake,
    clock: "4:48 AM",
    gate: 1,
    open: lake === "louise" ? 6 : 4,
    strikes: 0,
    hasPass: false,
    hasCoffee: false,
    message: "",
    hint: "",
    breakdown: null,
    failTitle: "",
    failDetail: "",
    best,
    lakeside: false,
    lastStall: false,
  };
}

function toSnap(sim: Sim, best: number): Snap {
  return {
    phase: sim.phase,
    paused: sim.paused,
    lake: sim.lake,
    clock: formatClock(sim.clock, sim.gate),
    gate: Math.max(0, 1 - sim.clock / sim.gate),
    open: openCount(sim),
    strikes: sim.strikes,
    hasPass: sim.hasPass,
    hasCoffee: sim.hasCoffee,
    message: sim.messageT > 0 ? sim.message : sim.hint,
    hint: sim.hint,
    breakdown: sim.breakdown,
    failTitle: sim.failTitle,
    failDetail: sim.failDetail,
    best,
    lakeside: sim.lakeside,
    lastStall: sim.lastStall,
  };
}

function quip(snap: Snap) {
  if (snap.lastStall) return "Last legal stall. You will mention this, unprompted, for years.";
  if (snap.lakeside && snap.strikes === 0)
    return "Lakeside and unmarked. The canoes have not even been unstrapped.";
  if ((snap.breakdown?.total ?? 0) > 4200)
    return "You parked before the mountain was fully lit. Unfair, and correct.";
  if (snap.strikes > 0) return "In. Legal. A little scraped. The lake does not itemize the bumper.";
  return snap.lake === "moraine"
    ? "The peaks are doing that thing they do. You are allowed to just look."
    : "The water is that rude, perfect blue. You made it while it still belonged to the morning.";
}

export function ParkingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const qaRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<TouchState>(emptyTouch());
  const honkPrev = useRef(false);
  const audioRef = useRef<Sfx | null>(null);
  const bestRef = useRef(0);
  const lakeRef = useRef<LakeId>("louise");
  const [lake, setLake] = useState<LakeId>("louise");
  const [muted, setMuted] = useState(false);
  const [snap, setSnap] = useState<Snap>(() => titleSnap(0, "louise"));
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (!raw) return;
      const score = Number(JSON.parse(raw).score) || 0;
      bestRef.current = score;
      setSnap((s) => ({ ...s, best: score }));
    } catch {
      /* ignore broken saves */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setCoarse(mq.matches || window.innerWidth < 820);
    apply();
    mq.addEventListener("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  useEffect(() => {
    const audio = new Sfx();
    audioRef.current = audio;
    if (import.meta.env.DEV) {
      window.__controlsTest = {
        getYaw: () => simRef.current?.player.yaw ?? 0,
        getSpeed: () => simRef.current?.player.speed ?? 0,
        setKeys: (codes: string[]) => {
          qaRef.current = new Set(codes);
        },
        getState: () => {
          const sim = simRef.current;
          if (!sim) return null;
          return {
            x: sim.player.x,
            y: sim.player.y,
            yaw: sim.player.yaw,
            speed: sim.player.speed,
            phase: sim.phase,
            strikes: sim.strikes,
            open: sim.stalls.filter((s) => s.kind === "open" && s.claim === "none").length,
            fail: sim.failTitle,
            message: sim.message,
            pass: sim.hasPass,
            clock: sim.clock,
          };
        },
      };
    }

    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      const sim = simRef.current;
      if (e.code === "Escape" && sim?.phase === "drive") {
        sim.paused = !sim.paused;
        if (sim.paused) audio.stopEngine();
      }
      if (sim && sim.phase === "drive" && !sim.paused) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
          e.preventDefault();
        }
      }
      if (!audio.muted && (e.code.startsWith("Key") || e.code.startsWith("Arrow"))) audio.unlock();
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);

    const canvas = canvasRef.current;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastPub = 0;
    let pubPhase: Sim["phase"] | "title" = "title";
    let pubPaused = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const readActions = (): Actions => {
      const held = new Set<string>([...keysRef.current, ...qaRef.current]);
      const touch = touchRef.current;
      let steer = 0;
      if (held.has("KeyA") || held.has("ArrowLeft") || touch.left) steer += 1;
      if (held.has("KeyD") || held.has("ArrowRight") || touch.right) steer -= 1;
      const throttle = held.has("KeyW") || held.has("ArrowUp") || touch.gas;
      const brake = held.has("KeyS") || held.has("ArrowDown") || touch.brake;
      const honkDown = held.has("Space") || touch.honk;
      const honk = honkDown && !honkPrev.current;
      honkPrev.current = honkDown;
      return {
        steer: Math.max(-1, Math.min(1, steer)),
        throttle: throttle ? 1 : 0,
        brake: brake ? 1 : 0,
        honk,
      };
    };

    const playEvents = (sim: Sim) => {
      const sfx = audioRef.current;
      if (!sfx) return;
      for (const event of sim.events) {
        if (event === "hit") sfx.hit();
        else if (event === "pickup") sfx.pickup();
        else if (event === "honk") sfx.honk();
        else if (event === "scrape") sfx.scrape();
        else if (event === "taken") sfx.taken();
        else if (event === "fail") {
          sfx.fail();
          sfx.stopEngine();
        } else if (event === "win") {
          sfx.win();
          sfx.stopEngine();
          if (sim.score > bestRef.current) {
            bestRef.current = sim.score;
            try {
              localStorage.setItem(BEST_KEY, JSON.stringify({ score: sim.score, lake: sim.lake }));
            } catch {
              /* private mode */
            }
          }
        }
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += dt;
      const ctx = canvas?.getContext("2d");
      const sim = simRef.current;
      if (ctx && canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const bw = Math.max(1, Math.floor(rect.width * dpr));
        const bh = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (sim) {
          const actions = readActions();
          let steps = 0;
          while (acc >= 1 / 60 && steps < 5) {
            stepSim(sim, 1 / 60, sim.paused ? { steer: 0, throttle: 0, brake: 0, honk: false } : actions);
            playEvents(sim);
            acc -= 1 / 60;
            steps += 1;
          }
          if (!sim.paused && sim.phase === "drive") sfxEngine(sim, actions);
          updateCamera(sim, dt, reduce);
          drawWorld(ctx, sim, rect.width, rect.height);
          const urgent = sim.phase !== pubPhase || sim.paused !== pubPaused;
          if (urgent || now - lastPub > 100) {
            lastPub = now;
            pubPhase = sim.phase;
            pubPaused = sim.paused;
            setSnap(toSnap(sim, bestRef.current));
          }
        } else {
          acc = 0;
          ctx.fillStyle = "#102033";
          ctx.fillRect(0, 0, rect.width, rect.height);
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const sfxEngine = (sim: Sim, actions: Actions) => {
      audio.engineSpeed(sim.player.speed, actions.throttle);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      audio.stopEngine();
      if (import.meta.env.DEV) delete window.__controlsTest;
    };
  }, []);

  const start = (next = lakeRef.current) => {
    audioRef.current?.unlock();
    if (muted) audioRef.current?.setMuted(true);
    const sim = createSim(next);
    simRef.current = sim;
    setSnap(toSnap(sim, bestRef.current));
  };

  const backToTitle = () => {
    audioRef.current?.stopEngine();
    simRef.current = null;
    keysRef.current.clear();
    setSnap(titleSnap(bestRef.current, lakeRef.current));
  };

  const pickLake = (id: LakeId) => {
    lakeRef.current = id;
    setLake(id);
    setSnap((s) => (s.phase === "title" ? { ...s, lake: id, open: id === "louise" ? 6 : 4 } : s));
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audioRef.current?.setMuted(next);
    if (!next) audioRef.current?.unlock();
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-night text-snow select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-hidden />

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-3 right-3 z-40 flex size-11 items-center justify-center rounded-full border border-snow/25 bg-night/80 text-snow"
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      {snap.phase === "title" ? (
        <Title lake={lake} best={snap.best} onPick={pickLake} onStart={() => start(lake)} />
      ) : null}

      {snap.phase === "drive" ? <Hud snap={snap} showKeys={!coarse} /> : null}

      {snap.phase === "drive" && snap.paused ? (
        <Pause onResume={() => {
          if (simRef.current) simRef.current.paused = false;
        }} onQuit={backToTitle} />
      ) : null}

      {snap.phase === "won" && snap.breakdown ? (
        <Result
          art={snap.lake === "moraine" ? moraineArt : louiseArt}
          title={snap.lake === "moraine" ? "Moraine, before the crowd" : "Louise, while it was still yours"}
          line={quip(snap)}
          breakdown={snap.breakdown}
          onAgain={() => start(snap.lake)}
          onOther={() => {
            const next = snap.lake === "louise" ? "moraine" : "louise";
            pickLake(next);
            start(next);
          }}
          onTitle={backToTitle}
          otherLabel={snap.lake === "louise" ? "Try Moraine" : "Try Louise"}
        />
      ) : null}

      {snap.phase === "lost" ? (
        <Fail
          title={snap.failTitle}
          detail={snap.failDetail}
          onAgain={() => start(snap.lake)}
          onTitle={backToTitle}
        />
      ) : null}

      {coarse && snap.phase === "drive" && !snap.paused ? (
        <Touch pads={touchRef} />
      ) : null}
    </div>
  );
}

function Title({
  lake,
  best,
  onPick,
  onStart,
}: {
  lake: LakeId;
  best: number;
  onPick: (id: LakeId) => void;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col md:flex-row">
      <div className="relative h-36 shrink-0 md:h-auto md:w-1/2">
        <img src={dawnArt} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-night via-night/20 to-transparent md:bg-linear-to-r" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto bg-night px-5 py-4 md:px-10">
        <p className="text-xs font-medium tracking-[0.22em] text-glow uppercase">FunApps · Banff</p>
        <h1 className="mt-2 font-display text-4xl leading-none font-semibold text-snow sm:text-6xl">
          Parking
          <span className="block text-glacier">Scramble</span>
        </h1>
        <p className="mt-3 max-w-md text-base leading-snug text-mist">
          Summer, before the road closed. Eleven stalls, a convoy that also set alarms, and a lake that will not wait.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <LakeCard
            selected={lake === "louise"}
            name="Lake Louise"
            detail="Wider road. A paid lot. Canoes if you are early."
            onClick={() => onPick("louise")}
          />
          <LakeCard
            selected={lake === "moraine"}
            name="Moraine Lake"
            detail="Narrow, wild, and worth more if you stop inside the lines."
            onClick={() => onPick("moraine")}
          />
        </div>
        <button
          type="button"
          onClick={onStart}
          className="mt-4 h-12 w-full rounded-xl bg-glacier text-base font-semibold text-night sm:w-auto sm:px-8"
        >
          Start the scramble
        </button>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-mist sm:grid-cols-4">
          <div><dt className="text-snow">W</dt><dd>Gas</dd></div>
          <div><dt className="text-snow">S</dt><dd>Brake / reverse</dd></div>
          <div><dt className="text-snow">A / D</dt><dd>Steer</dd></div>
          <div><dt className="text-snow">Space</dt><dd>Honk a rival</dd></div>
        </dl>
        <p className="mt-3 text-sm text-mist">
          {best > 0 ? `Best morning ${best.toLocaleString()}` : "No legal park yet."}
          {" · "}
          Grab the pass. Empty stalls glow. Stop square inside one.
        </p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-mist/80">
          Moraine Lake Road has been closed to personal vehicles since 2023. This is a fond reenactment of the scramble. When it is real, take the shuttle.
        </p>
      </div>
    </div>
  );
}

function LakeCard({
  selected,
  name,
  detail,
  onClick,
}: {
  selected: boolean;
  name: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "rounded-xl border px-3 py-3 text-left " +
        (selected ? "border-glacier bg-pine/80" : "border-snow/20 bg-night-2/40")
      }
    >
      <span className="flex items-center gap-2 font-display text-lg text-snow">
        <Mountain className="size-4 text-glow" aria-hidden />
        {name}
      </span>
      <span className="mt-1 block text-sm leading-snug text-mist">{detail}</span>
    </button>
  );
}

function Hud({ snap, showKeys }: { snap: Snap; showKeys: boolean }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1.5 p-3 pr-16">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-2xl leading-none text-snow">{snap.clock}</p>
            <p className="text-xs tracking-widest text-mist uppercase">
              {snap.lake === "louise" ? "Lake Louise" : "Moraine Lake"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl leading-none text-glacier">{snap.open}</p>
            <p className="text-xs tracking-widest text-mist uppercase">open stalls</p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-snow/15">
          <div className="h-full rounded-full bg-glow" style={{ width: `${Math.round(snap.gate * 100)}%` }} />
        </div>
        <div className="flex items-center gap-3 text-xs text-mist">
          <span>{snap.hasPass ? "Pass in the glovebox" : "No pass yet"}</span>
          {snap.hasCoffee ? (
            <span className="inline-flex items-center gap-1 text-glow">
              <Coffee className="size-3.5" aria-hidden /> ×1.25
            </span>
          ) : null}
          <span className="ml-auto tracking-widest">
            {"●".repeat(Math.max(0, 3 - snap.strikes))}
            <span className="text-danger">{"●".repeat(Math.min(3, snap.strikes))}</span>
          </span>
        </div>
      </div>
      <div className={"pointer-events-none absolute inset-x-0 z-20 px-4 " + (showKeys ? "bottom-3" : "bottom-28")}>
        <p className="mx-auto max-w-lg rounded-xl bg-night/80 px-3 py-2 text-center text-sm text-snow" aria-live="polite">
          {snap.message}
        </p>
        {showKeys ? (
          <p className="mt-1 text-center text-xs text-mist">A left · D right · W gas · S reverse · Space honk</p>
        ) : null}
      </div>
    </>
  );
}

function Pause({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-night/75 px-5">
      <div className="w-full max-w-sm rounded-2xl border border-snow/20 bg-night p-6">
        <h2 className="font-display text-3xl text-snow">Pulled over</h2>
        <p className="mt-2 text-sm text-mist">The convoy does not pull over. The stalls do not either.</p>
        <button type="button" onClick={onResume} className="mt-5 h-12 w-full rounded-xl bg-glacier font-semibold text-night">
          Keep going
        </button>
        <button type="button" onClick={onQuit} className="mt-2 h-12 w-full rounded-xl border border-snow/25 text-snow">
          Back to the valley
        </button>
      </div>
    </div>
  );
}

function Result({
  art,
  title,
  line,
  breakdown,
  onAgain,
  onOther,
  onTitle,
  otherLabel,
}: {
  art: string;
  title: string;
  line: string;
  breakdown: Breakdown;
  onAgain: () => void;
  onOther: () => void;
  onTitle: () => void;
  otherLabel: string;
}) {
  const rows: [string, string][] = [
    ["Still dark", `+${breakdown.arrival}`],
    ["Inside the lines", `+${breakdown.clean}`],
    ["Park pass", breakdown.pass ? `+${breakdown.pass}` : "—"],
    ["No contact", breakdown.contact ? `+${breakdown.contact}` : "—"],
    ["Lakeside", breakdown.side ? `+${breakdown.side}` : "—"],
    ["Moraine", breakdown.lake ? `+${breakdown.lake}` : "—"],
    ["Last stall", breakdown.last ? `+${breakdown.last}` : "—"],
    ["Dings", breakdown.dings ? `−${breakdown.dings}` : "—"],
  ];
  return (
    <div className="absolute inset-0 z-30 flex flex-col">
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-linear-to-t from-night via-night/55 to-night/10" />
      <div className="relative mt-auto max-h-[78%] overflow-y-auto px-5 pt-16 pb-5">
        <p className="text-xs tracking-[0.2em] text-glow uppercase">You parked</p>
        <h2 className="font-display text-4xl leading-tight text-snow">{title}</h2>
        <p className="mt-2 max-w-lg text-base text-snow/90">{line}</p>
        <div className="mt-4 flex items-end justify-between">
          <p className="font-display text-5xl text-glacier">{breakdown.total.toLocaleString()}</p>
          {breakdown.coffee ? <p className="text-sm text-glow">Coffee ×1.25</p> : null}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-snow/10 py-1">
              <dt className="text-mist">{k}</dt>
              <dd className="text-snow">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onAgain} className="h-12 flex-1 rounded-xl bg-glacier font-semibold text-night">
            One more morning
          </button>
          <button type="button" onClick={onOther} className="h-12 flex-1 rounded-xl border border-snow/30 text-snow">
            {otherLabel}
          </button>
          <button type="button" onClick={onTitle} className="h-12 flex-1 rounded-xl text-mist">
            Title
          </button>
        </div>
      </div>
    </div>
  );
}

function Fail({
  title,
  detail,
  onAgain,
  onTitle,
}: {
  title: string;
  detail: string;
  onAgain: () => void;
  onTitle: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-end bg-night/80 px-5 py-6 sm:items-center sm:justify-center">
      <div className="w-full max-w-md rounded-2xl border border-snow/15 bg-night p-6">
        <p className="text-xs tracking-[0.2em] text-danger uppercase">Turned around</p>
        <h2 className="mt-2 font-display text-4xl leading-tight text-snow">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-mist">{detail}</p>
        <button type="button" onClick={onAgain} className="mt-6 h-12 w-full rounded-xl bg-glow font-semibold text-night">
          Set another alarm
        </button>
        <button type="button" onClick={onTitle} className="mt-2 h-12 w-full text-mist">
          Back to the valley
        </button>
      </div>
    </div>
  );
}

function Touch({ pads }: { pads: { current: TouchState } }) {
  const bind = (key: keyof TouchState) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      pads.current[key] = true;
    },
    onPointerUp: () => {
      pads.current[key] = false;
    },
    onPointerCancel: () => {
      pads.current[key] = false;
    },
    onPointerLeave: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) pads.current[key] = false;
    },
  });
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3 pb-4">
      <div className="flex gap-2">
        <Pad label="Left" {...bind("left")} />
        <Pad label="Right" {...bind("right")} />
      </div>
      <div className="flex gap-2">
        <Pad label="Honk" {...bind("honk")} />
        <Pad label="Brake" {...bind("brake")} />
        <Pad label="Gas" primary {...bind("gas")} />
      </div>
    </div>
  );
}

function Pad({
  label,
  primary,
  ...rest
}: { label: string; primary?: boolean } & HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={
        "h-16 min-w-16 rounded-2xl border px-3 text-sm font-semibold " +
        (primary ? "border-glacier bg-glacier text-night" : "border-snow/30 bg-night/75 text-snow")
      }
      {...rest}
    >
      {label}
    </button>
  );
}
