import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Game, loadArt, type Hud } from "./game/engine";
import { Sound } from "./game/audio";

const EMPTY: Hud = {
  phase: "loading",
  time: 72,
  score: 0,
  berries: 0,
  postcards: 0,
  tokens: 0,
  dist: 0,
  finish: 480,
  best: 0,
  banner: "",
  hint: "",
  muted: false,
  seed: 0,
  closeCall: false,
  timeBonus: 0,
};

function clock(seconds: number) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function LastBoat() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<Hud>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    const sound = new Sound();
    let game: Game | null = null;

    const paint = () => {
      if (game) setHud(game.hud());
    };

    const fit = () => {
      if (!game || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      game.resize(rect.width, rect.height, dpr);
    };

    void loadArt().then((art) => {
      if (dead || !canvas) return;
      game = new Game(canvas, art, sound);
      game.onChange = paint;
      gameRef.current = game;
      fit();
      game.startLoop();
      setReady(true);
      paint();
    });

    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    const onVis = () => {
      if (document.hidden && game?.phase === "play") game.togglePause();
      else sound.resume();
    };
    document.addEventListener("visibilitychange", onVis);

    const keys = new Set<string>();
    const jumpKeys = new Set(["Space", "ArrowUp", "KeyW"]);
    const onKey = (event: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g) return;
      if (jumpKeys.has(event.code) || event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
      }
      if (event.repeat) return;
      keys.add(event.code);
      if (jumpKeys.has(event.code)) {
        if (g.phase === "menu") g.play();
        else if (g.phase === "play") g.jumpEdge = true;
        else if (g.phase === "win" || g.phase === "lose") g.play();
        paint();
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") g.duckHeld = true;
      if (event.code === "KeyP" || event.code === "Escape") {
        if (g.phase === "play" || g.phase === "pause") g.togglePause();
      }
      if (event.code === "KeyM") g.toggleMute();
      if (event.code === "KeyR" && (g.phase === "win" || g.phase === "lose")) g.play(g.seed);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
      const g = gameRef.current;
      if (!g) return;
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        g.duckHeld = keys.has("ArrowDown") || keys.has("KeyS");
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    const poll = window.setInterval(paint, 120);

    return () => {
      dead = true;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.clearInterval(poll);
      game?.stop();
    };
  }, []);

  const g = gameRef.current;
  const playing = hud.phase === "play" || hud.phase === "pause";
  const progress = Math.min(1, hud.dist / hud.finish);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg font-sans text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="Last Boat, a run along Western Brook Pond"
        onPointerDown={(event) => {
          const game = gameRef.current;
          if (!game || game.phase !== "play") return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          if (x < rect.width * 0.42) game.duckHeld = true;
          else game.jumpEdge = true;
        }}
        onPointerUp={() => {
          const game = gameRef.current;
          if (game) game.duckHeld = false;
        }}
        onPointerLeave={() => {
          const game = gameRef.current;
          if (game && game.phase === "play") game.duckHeld = false;
        }}
      />

      {playing && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted uppercase">To the dock</p>
              <p
                className={`font-display text-4xl leading-none font-semibold ${hud.time <= 15 ? "text-accent" : "text-fg"}`}
              >
                {clock(hud.time)}
              </p>
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <p className="mr-1 text-right text-sm text-muted">
                <span className="block font-display text-xl leading-none text-fg">
                  {hud.score.toLocaleString()}
                </span>
                berries {hud.berries}
              </p>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface text-fg"
                onClick={() => g?.toggleMute()}
                aria-label={hud.muted ? "Unmute" : "Mute"}
              >
                {hud.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-lg border border-border bg-surface text-fg"
                onClick={() => g?.togglePause()}
                aria-label={hud.phase === "pause" ? "Resume" : "Pause"}
              >
                {hud.phase === "pause" ? <Play size={18} /> : <Pause size={18} />}
              </button>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
          </div>
          {hud.banner && (
            <p className="rise font-display text-2xl text-accent">{hud.banner}</p>
          )}
          {hud.hint && <p className="text-sm text-muted">{hud.hint}</p>}
        </div>
      )}

      {hud.phase === "pause" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-bg/70 p-6">
          <div className="rise w-full max-w-md rounded-xl border border-border bg-surface p-6">
            <p className="text-xs tracking-[0.18em] text-accent uppercase">Hold the boat</p>
            <h2 className="mt-2 font-display text-4xl leading-none">The clock is paused.</h2>
            <p className="mt-3 text-muted">
              The pond is not impressed, but we made an exception. The sailing is still {clock(hud.time)}.
            </p>
            <button
              type="button"
              className="mt-6 h-12 rounded-lg bg-primary px-5 font-semibold text-primary-fg"
              onClick={() => g?.togglePause()}
            >
              Keep running
            </button>
          </div>
        </div>
      )}

      {(hud.phase === "menu" || hud.phase === "loading" || !ready) && (
        <div className="absolute inset-0 z-20">
          <div className="menu-scrim absolute inset-0" />
          <div className="relative flex h-full max-w-xl flex-col justify-end p-6 pb-10 sm:justify-center sm:p-12">
            <p className="text-xs tracking-[0.22em] text-accent uppercase">
              FunApps · Gros Morne
            </p>
            <h1 className="mt-3 font-display text-6xl leading-none font-semibold sm:text-7xl">
              Last Boat
            </h1>
            <p className="mt-3 font-display text-2xl text-fg italic">The horn already went.</p>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
              Western Brook is idling at the dock. A few hundred metres of bog boardwalk, tuckamore,
              and one moose who believes the trail is his. Jump the rocks. Duck the spruce. Get on
              before she slips into the fjord.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="h-14 rounded-lg bg-primary px-6 text-lg font-semibold text-primary-fg disabled:opacity-60"
                disabled={!ready}
                onPointerDown={() => gameRef.current?.unlock()}
                onClick={() => gameRef.current?.play()}
              >
                {ready ? "Make the boat" : "Waxing the boardwalk…"}
              </button>
              {hud.best > 0 && (
                <p className="text-sm text-muted">Best aboard {hud.best.toLocaleString()}</p>
              )}
            </div>
            <p className="mt-4 text-sm text-muted">Space to jump · Down to duck · P to pause</p>
          </div>
        </div>
      )}

      {(hud.phase === "win" || hud.phase === "lose") && (
        <div className="absolute inset-0 z-20 flex items-end justify-center p-4 sm:items-center">
          <div className="rise w-full max-w-md rounded-xl border border-border bg-bg/95 p-6">
            <p className="text-xs tracking-[0.18em] text-accent uppercase">
              {hud.phase === "win" ? "Western Brook Pond" : "Missed sailing"} · {hud.seed}
            </p>
            <h2 className="mt-2 font-display text-5xl leading-none">
              {hud.phase === "win" ? "You're aboard." : "She's gone."}
            </h2>
            <p className="mt-3 text-muted">
              {hud.phase === "win"
                ? "The cliffs open up ahead of the bow. Somebody shifts down the bench. You made the sailing, and the fjord is just getting started."
                : hud.closeCall
                  ? "You could see the rope from here. The white cabin is already shrinking into the pond."
                  : "The horn rolls around the cliffs and the tour boat does not do late seating. Next sailing is whenever you say so."}
            </p>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted">Score</dt>
                <dd className="font-display text-2xl">{hud.score.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted">Berries</dt>
                <dd className="font-display text-2xl">{hud.berries}</dd>
              </div>
              <div>
                <dt className="text-muted">Left</dt>
                <dd className="font-display text-2xl">{clock(hud.time)}</dd>
              </div>
            </dl>
            {hud.phase === "win" && hud.timeBonus > 0 && (
              <p className="mt-2 text-sm text-accent">Time on the bench +{hud.timeBonus}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="h-12 rounded-lg bg-primary px-5 font-semibold text-primary-fg"
                onClick={() => gameRef.current?.play()}
              >
                New sailing
              </button>
              <button
                type="button"
                className="h-12 rounded-lg border border-border bg-surface px-5 font-semibold text-fg"
                onClick={() => gameRef.current?.play(hud.seed)}
              >
                Same trail
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="touch-controls pointer-events-none absolute inset-x-0 bottom-0 z-30 justify-between gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {(hud.phase === "play" || hud.phase === "pause") && (
          <>
            <button
              type="button"
              className="pointer-events-auto h-16 min-w-28 rounded-lg border border-border bg-surface/95 px-4 text-base font-semibold text-fg"
              onPointerDown={(event) => {
                event.preventDefault();
                const game = gameRef.current;
                if (!game) return;
                game.duckHeld = true;
              }}
              onPointerUp={() => {
                const game = gameRef.current;
                if (game) game.duckHeld = false;
              }}
              onPointerCancel={() => {
                const game = gameRef.current;
                if (game) game.duckHeld = false;
              }}
            >
              Duck
            </button>
            <button
              type="button"
              className="pointer-events-auto h-16 min-w-28 rounded-lg bg-primary px-4 text-base font-semibold text-primary-fg"
              onPointerDown={(event) => {
                event.preventDefault();
                const game = gameRef.current;
                if (!game) return;
                if (game.phase === "pause") game.togglePause();
                else game.jumpEdge = true;
              }}
            >
              Jump
            </button>
          </>
        )}
      </div>
    </main>
  );
}
