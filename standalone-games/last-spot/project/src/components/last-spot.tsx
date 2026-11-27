import { useEffect, useRef, useState, type ReactNode } from "react";
import { Gauge, Pause, Play, Timer, Volume2, VolumeX } from "lucide-react";
import { playSfx, resumeAudio, syncAudio, unlockAudio } from "../game/audio";
import { draw } from "../game/draw";
import {
  beginGame,
  createSim,
  installProbe,
  nextEvening,
  retryEvening,
  snap,
  step,
  toggleMute,
  type HudSnap,
  type Sim,
} from "../game/logic";

const INITIAL: HudSnap = {
  phase: "menu",
  paused: false,
  round: 1,
  name: "Tuesday after the rain",
  blurb: "Two stalls are open. They will not stay that way.",
  gate: "1:20",
  hot: false,
  stress: 8,
  score: 0,
  best: 0,
  message: "",
  hint: "",
  tone: "info",
  park: 0,
  open: 2,
  resultTitle: "",
  resultBody: "",
  resultGain: 0,
  muted: false,
};

export function LastSpot() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  if (!simRef.current) simRef.current = createSim();
  const [hud, setHud] = useState<HudSnap>(INITIAL);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const sim = simRef.current!;
    installProbe(sim);
    setHud(snap(sim));
    const canvas = canvasRef.current;
    if (!canvas) return;

    const query = () => setTouch(window.innerWidth < 900 || window.matchMedia("(pointer: coarse)").matches);
    query();
    window.addEventListener("resize", query);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Space") {
        e.preventDefault();
      }
      sim.keys.add(e.code);
      unlockAudio();
      if ((e.code === "Escape" || e.code === "KeyP") && sim.phase === "play") {
        sim.paused = !sim.paused;
        setHud(snap(sim));
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      sim.keys.delete(e.code);
    };
    const clear = () => sim.keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
      else clear();
    };
    document.addEventListener("visibilitychange", onVis);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hudAt = 0;
    let prev = sim.phase;
    const loop = (now: number) => {
      const frame = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += frame;
      let n = 0;
      while (acc >= 1 / 60 && n < 5) {
        step(sim, 1 / 60);
        acc -= 1 / 60;
        n += 1;
      }
      if (acc > 0.25) acc = 0;
      const driving = sim.phase === "play" && !sim.paused;
      syncAudio(sim.player.speed, driving, sim.muted);
      if (sim.sfx.length) {
        playSfx(sim.sfx);
        sim.sfx.length = 0;
      }
      draw(canvas, sim);
      if (sim.phase !== prev || now - hudAt > 80) {
        prev = sim.phase;
        hudAt = now;
        setHud(snap(sim));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      window.removeEventListener("resize", query);
      document.removeEventListener("visibilitychange", onVis);
      delete window.__controlsTest;
    };
  }, []);

  const sim = simRef.current!;

  const refresh = () => setHud(snap(sim));

  const hold =
    (steer: number, throttle: number) =>
    (down: boolean) => {
      unlockAudio();
      if (steer !== 0) sim.touchSteer = down ? steer : sim.touchSteer === steer ? 0 : sim.touchSteer;
      if (throttle !== 0) sim.touchThrottle = down ? throttle : sim.touchThrottle === throttle ? 0 : sim.touchThrottle;
    };

  return (
    <div className="relative h-dvh w-full select-none overflow-hidden bg-dusk text-cream">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-label="New London lighthouse parking lot" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-dusk via-dusk/80 to-transparent" />

      {hud.phase === "menu" && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4 md:justify-start md:p-8">
          <section className="max-h-[72dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-cream text-ink shadow-lg">
            <div className="h-1.5 bg-red" />
            <div className="flex flex-col gap-4 p-5 md:p-6">
              <div>
                <p className="text-xs font-medium tracking-[0.18em] text-bark uppercase">Prince Edward Island</p>
                <h1 className="font-display text-4xl leading-none text-ink">Last Spot</h1>
                <p className="mt-1 font-display text-lg text-red">New London Lighthouse</p>
              </div>
              <p className="text-base leading-relaxed text-bark">
                The bay is right there, the lantern room locks at dusk, and the gravel lot was full an hour ago. Nose into a painted stall before they chain the gate.
              </p>
              <button
                type="button"
                className="h-12 rounded-full bg-red px-6 text-base font-semibold text-cream"
                onClick={() => {
                  unlockAudio();
                  beginGame(sim);
                  refresh();
                }}
              >
                Start
              </button>
              <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-bark">
                <li>
                  <kbd>A</kbd> <kbd>D</kbd> steer, <kbd>W</kbd> gas, <kbd>S</kbd> brakes then reverses.
                </li>
                <li>A stall counts when you are inside the lines, lined up, and stopped.</li>
                <li>Shoulders, grass, and the aisle do not count. They honk, then they tow.</li>
                <li>If brake lights come on, commit. Someone behind you wants it too.</li>
              </ul>
              <p className="text-sm text-bark">Best {hud.best}</p>
            </div>
          </section>
        </div>
      )}

      {hud.phase !== "menu" && (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-3 md:p-5">
          <div className="pointer-events-auto max-w-[46%] rounded-2xl bg-dusk/85 px-3 py-2 backdrop-blur-sm">
            <p className="text-xs tracking-[0.14em] text-sand uppercase">Evening {hud.round}</p>
            <p className="truncate font-display text-lg leading-tight">{hud.name}</p>
            <p className="text-sm text-sand tabular-nums">
              {hud.open} open · {hud.score}
            </p>
            <div className="mt-2 flex gap-2">
              <IconButton
                label={hud.paused ? "Resume" : "Pause"}
                onClick={() => {
                  if (sim.phase !== "play") return;
                  sim.paused = !sim.paused;
                  refresh();
                }}
              >
                {hud.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              </IconButton>
              <IconButton
                label={hud.muted ? "Unmute" : "Mute"}
                onClick={() => {
                  unlockAudio();
                  toggleMute(sim);
                  refresh();
                }}
              >
                {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </IconButton>
            </div>
          </div>

          <div className={`pointer-events-none rounded-2xl bg-cream px-3 py-2 text-center text-ink ${hud.hot ? "timer-hot" : ""}`}>
            <p className="flex items-center justify-center gap-1 text-xs tracking-[0.16em] text-bark">
              <Timer className="size-3.5" aria-hidden />
              GATE
            </p>
            <p className={`font-display text-3xl leading-none tabular-nums ${hud.hot ? "text-red" : "text-ink"}`}>{hud.gate}</p>
          </div>

          <div className="w-28 rounded-2xl bg-dusk/85 px-3 py-2 backdrop-blur-sm md:w-36">
            <p className="flex items-center gap-1 text-xs tracking-[0.14em] text-sand">
              <Gauge className="size-3.5" aria-hidden />
              FRAY
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink">
              <div className="h-full bg-red" style={{ width: `${Math.round(hud.stress)}%` }} />
            </div>
            <p className="mt-1 text-right text-xs text-sand tabular-nums">best {hud.best}</p>
          </div>
        </header>
      )}

      {hud.phase === "play" && (hud.message || hud.hint || hud.park > 0) && (
        <div className="absolute top-28 left-1/2 z-10 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl bg-cream px-4 py-2 text-center text-ink shadow-lg md:top-24">
          <p className={`text-sm leading-snug ${hud.message && hud.tone === "bad" ? "text-red" : "text-ink"}`}>
            {hud.message || hud.hint}
          </p>
          {hud.park > 0 && (
            <div className="mt-2">
              <p className="text-xs tracking-[0.14em] text-bark uppercase">Settling</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sand">
                <div className="h-full bg-red" style={{ width: `${Math.round(hud.park * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {hud.paused && hud.phase === "play" && (
        <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-cream px-6 py-4 text-center text-ink">
          <p className="font-display text-2xl">Paused</p>
          <p className="text-sm text-bark">The gate does not wait, except right now.</p>
        </div>
      )}

      {hud.phase === "play" && !touch && (
        <p className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-dusk/80 px-4 py-2 text-sm text-cream">
          A D steer · W gas · S brake
        </p>
      )}

      {(hud.phase === "win" || hud.phase === "lose") && (
        <div className="absolute inset-0 z-20 flex items-end justify-center p-4 md:items-center">
          <section className="w-full max-w-md rounded-2xl bg-cream text-ink shadow-lg">
            <div className={`h-1.5 ${hud.phase === "win" ? "bg-red" : "bg-ink"}`} />
            <div className="flex flex-col gap-3 p-5 md:p-6">
              <p className="text-xs tracking-[0.16em] text-bark uppercase">
                Evening {hud.round} · {hud.score}
              </p>
              <h2 className="font-display text-4xl leading-none">{hud.resultTitle}</h2>
              <p className="text-base leading-relaxed text-bark">{hud.resultBody}</p>
              {hud.phase === "win" && <p className="font-display text-xl text-red">+{hud.resultGain}</p>}
              <div className="flex flex-wrap gap-2">
                {hud.phase === "win" ? (
                  <button
                    type="button"
                    className="h-12 rounded-full bg-red px-5 text-base font-semibold text-cream"
                    onClick={() => {
                      unlockAudio();
                      nextEvening(sim);
                      refresh();
                    }}
                  >
                    Next evening
                  </button>
                ) : (
                  <button
                    type="button"
                    className="h-12 rounded-full bg-red px-5 text-base font-semibold text-cream"
                    onClick={() => {
                      unlockAudio();
                      retryEvening(sim);
                      refresh();
                    }}
                  >
                    Try this evening again
                  </button>
                )}
                <button
                  type="button"
                  className="h-12 rounded-full border border-sand px-5 text-base font-semibold text-ink"
                  onClick={() => {
                    unlockAudio();
                    beginGame(sim);
                    refresh();
                  }}
                >
                  From the top
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {touch && hud.phase === "play" && !hud.paused && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex items-end justify-between px-3">
          <div className="flex gap-2">
            <TouchButton label="Left" onHold={hold(1, 0)} />
            <TouchButton label="Right" onHold={hold(-1, 0)} />
          </div>
          <div className="flex gap-2">
            <TouchButton label="Brake" onHold={hold(0, -1)} />
            <TouchButton label="Gas" onHold={hold(0, 1)} />
          </div>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {hud.message || hud.hint}
        {hud.phase === "win" ? hud.resultTitle : ""}
        {hud.phase === "lose" ? hud.resultTitle : ""}
      </p>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full bg-cream text-ink"
    >
      {children}
    </button>
  );
}

function TouchButton({ label, onHold }: { label: string; onHold: (down: boolean) => void }) {
  return (
    <button
      type="button"
      className="h-14 min-w-16 rounded-2xl bg-cream px-4 text-base font-semibold text-ink"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onLostPointerCapture={() => onHold(false)}
    >
      {label}
    </button>
  );
}
