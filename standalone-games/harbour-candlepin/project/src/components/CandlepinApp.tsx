import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { BALL_Z, HEAD_Z } from "@/game/physics";
import { drawScene, project, unproject } from "@/game/render";
import { rollGlyph, type Roll } from "@/game/scoring";
import { AlleySim, POWER_BAND, type Snap } from "@/game/sim";

export function CandlepinApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<AlleySim | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "aim" | "hand"; pushing: boolean; startX: number; startY: number } | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);

  useEffect(() => {
    const sim = new AlleySim();
    simRef.current = sim;
    const seen = { rev: -1 };
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sim.tick(dt);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && canvas.width > 0 && canvas.height > 0) {
        const playing = sim.phase === "aim" || sim.phase === "meter";
        drawScene(ctx, sim.world, {
          w: canvas.width,
          h: canvas.height,
          time: sim.time,
          stance: sim.phase === "attract" ? (sim.world.ball?.x ?? 0) : sim.stance,
          target: sim.target,
          power: sim.phase === "meter" ? sim.power : 0.85,
          spin: sim.spin,
          guide: sim.save.guide || sim.pulling,
          shake: sim.save.shake,
          showMarks: playing,
          showLeave: !sim.match.rackFull && (playing || sim.phase === "gap"),
          setter: sim.phase === "setter" ? sim.setter : 0,
          attract: sim.phase === "attract",
          reduceMotion: sim.reduceMotion,
          pull: sim.pullVisual ? { nx: sim.pullVisual.nx, ny: sim.pullVisual.ny, power: sim.power } : null,
        });
      }
      if (meterRef.current) {
        const shown = sim.phase === "meter" ? sim.power : 0;
        meterRef.current.style.transform = `scaleX(${shown})`;
      }
      const hot =
        sim.phase === "meter" && sim.power >= POWER_BAND.lo && sim.power <= POWER_BAND.hi;
      trackRef.current?.classList.toggle("band-hot", hot);
      if (sim.rev !== seen.rev) {
        seen.rev = sim.rev;
        setSnap(sim.snapshot());
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    const onKeyDown = (event: KeyboardEvent) => sim.keyDown(event);
    const onKeyUp = (event: KeyboardEvent) => sim.keyUp(event);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const fit = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(2, Math.floor(rect.width * dpr));
      canvas.height = Math.max(2, Math.floor(rect.height * dpr));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  const phase = snap?.phase ?? "attract";
  const showSheet = phase !== "attract";

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
      canvas,
    };
  }

  function applyDrag(x: number, y: number, canvas: HTMLCanvasElement) {
    const alley = simRef.current;
    const gesture = drag.current;
    if (!alley || !gesture) return;
    if (gesture.mode === "aim") {
      const hit = unproject(x, y, canvas.width, canvas.height);
      if (hit) alley.setTarget(hit.x);
      return;
    }
    const ball = project(alley.stance, BALL_Z, canvas.width, canvas.height);
    const up = gesture.startY - y;
    const slack = Math.max(16, canvas.height * 0.035);
    if (up < slack) {
      if (gesture.pushing) {
        alley.cancelPull();
        gesture.pushing = false;
      }
      const atBall = unproject(x, ball.y, canvas.width, canvas.height);
      if (atBall) alley.setStance(atBall.x);
      return;
    }
    gesture.pushing = true;
    const finger = unproject(x, Math.min(y, ball.y - 4), canvas.width, canvas.height);
    if (finger && finger.z > BALL_Z + 24) {
      const dz = finger.z - BALL_Z;
      const aim = alley.stance + ((finger.x - alley.stance) * (HEAD_Z - BALL_Z)) / dz;
      alley.setTarget(aim);
    }
    const power = Math.max(0, Math.min(1, up / (canvas.height * 0.28)));
    alley.setPull(power, { nx: x / canvas.width, ny: y / canvas.height });
    const drift = (x - gesture.startX) / Math.max(48, canvas.width * 0.09);
    alley.setSpin(Math.abs(drift) > 0.55 ? Math.max(-1, Math.min(1, drift)) : 0);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-cream">
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-brass">FUNAPPS</p>
          <h1 className="truncate font-display text-xl leading-none text-cream">Harbour Candlepin</h1>
        </div>
        <div className="flex items-center gap-2">
          {showSheet && snap ? (
            <p className="text-sm font-semibold tabular-nums text-cream">
              {snap.total === null ? "—" : snap.total}
              {snap.pending ? "+" : ""}
            </p>
          ) : null}
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-full bg-surface text-cream"
            aria-label={snap?.soundOn === false ? "Turn sound on" : "Mute sound"}
            onClick={() => simRef.current?.toggleSound()}
          >
            {snap?.soundOn === false ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
        </div>
      </header>

      {showSheet && snap ? <ScoreSheet snap={snap} /> : null}

      <div className="relative min-h-0 flex-1 bg-bg-deep">
        <canvas
          ref={canvasRef}
          className="lane-canvas absolute inset-0 h-full w-full"
          aria-label="Candlepin lane. Slide the ball sideways to stand, then push it up the lane to roll."
          onPointerDown={(event) => {
            const alley = simRef.current;
            const hit = point(event);
            if (!alley || !hit) return;
            if (alley.phase !== "aim") return;
            const ball = project(alley.stance, BALL_Z, hit.canvas.width, hit.canvas.height);
            const aim = project(alley.target, HEAD_Z - 18, hit.canvas.width, hit.canvas.height);
            const nearBall = (hit.x - ball.x) ** 2 + (hit.y - ball.y) ** 2;
            const nearAim = (hit.x - aim.x) ** 2 + (hit.y - aim.y) ** 2;
            const grab = Math.max(ball.scale * 5, 28) ** 2;
            const aboveBall = hit.y < ball.y - Math.max(36, hit.canvas.height * 0.1);
            drag.current = {
              mode: aboveBall || (nearAim < nearBall && nearAim < grab * 2) ? "aim" : "hand",
              pushing: false,
              startX: hit.x,
              startY: hit.y,
            };
            hit.canvas.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const hit = point(event);
            if (!hit) return;
            applyDrag(hit.x, hit.y, hit.canvas);
          }}
          onPointerUp={() => {
            const alley = simRef.current;
            const pushing = drag.current?.pushing;
            if (pushing && alley && alley.pulling && alley.power >= 0.2) alley.release();
            else alley?.cancelPull();
            drag.current = null;
          }}
          onPointerCancel={() => {
            simRef.current?.cancelPull();
            drag.current = null;
          }}
        />
        {snap?.callout ? (
          <div className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center px-4" aria-hidden>
            <div key={snap.calloutKey} className="callout-pop rounded-card bg-bg/80 px-5 py-3 text-center">
              <p className="font-display text-4xl text-cream">{snap.callout}</p>
              <p className="text-sm text-cream-dim">{snap.calloutSub}</p>
            </div>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {snap?.callout ? `${snap.callout}. ${snap.calloutSub ?? ""}` : ""}
        </p>
      </div>

      <section className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-4">
        {phase === "attract" ? (
          <Attract
            best={snap?.best ?? 0}
            strings={snap?.strings ?? 0}
            ready={Boolean(snap)}
            onBowl={() => simRef.current?.start()}
            onRules={() => simRef.current?.toggleRules()}
          />
        ) : null}
        {phase === "over" && snap ? (
          <Result snap={snap} onAgain={() => simRef.current?.start()} onDesk={() => simRef.current?.backToDesk()} />
        ) : null}
        {phase !== "attract" && phase !== "over" && snap ? (
          <Controls
            snap={snap}
            meterRef={meterRef}
            trackRef={trackRef}
            onGuide={() => simRef.current?.toggleGuide()}
            onRules={() => simRef.current?.toggleRules()}
          />
        ) : null}
        {snap?.rulesOpen ? <Rules onClose={() => simRef.current?.toggleRules()} /> : null}
      </section>
    </div>
  );
}

function ScoreSheet({ snap }: { snap: Snap }) {
  return (
    <div className="shrink-0 bg-cream px-2 py-2 text-ink">
      <div className="grid grid-cols-5 gap-1 md:grid-cols-10">
        {snap.rolls.map((frame, index) => (
          <FrameCell
            key={index}
            index={index}
            frame={frame}
            score={snap.cumul[index] ?? null}
            live={snap.phase !== "over" && index === snap.frameIndex}
          />
        ))}
      </div>
    </div>
  );
}

function FrameCell({
  index,
  frame,
  score,
  live,
}: {
  index: number;
  frame: Roll[];
  score: number | null;
  live: boolean;
}) {
  const label = frame.map((roll) => rollGlyph(roll) || "·").join(" ");
  return (
    <div
      className={`min-w-0 rounded-md border px-1 py-1 ${live ? "border-brass bg-cream-dim" : "border-ink/10"}`}
      aria-label={`Frame ${index + 1}, ${label || "not bowled"}${score !== null ? `, score ${score}` : ""}`}
    >
      <p className="text-center text-xs text-ink/60">{index + 1}</p>
      <div className="mt-1 grid grid-cols-3 gap-0.5">
        {[0, 1, 2].map((box) => {
          const glyph = rollGlyph(frame[box]);
          const marked = glyph === "X" || glyph === "/";
          return (
            <div
              key={box}
              className={`flex h-5 items-center justify-center border border-ink/15 text-xs font-semibold tabular-nums ${marked ? "text-red" : "text-ink"}`}
            >
              {glyph}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-center text-sm font-semibold tabular-nums">{score ?? ""}</p>
    </div>
  );
}

function Attract({
  best,
  strings,
  ready,
  onBowl,
  onRules,
}: {
  best: number;
  strings: number;
  ready: boolean;
  onBowl: () => void;
  onRules: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <p className="font-display text-lg text-cream-dim italic">
        A small ball. Tall skinny pins. Three tries, and whatever falls stays put.
      </p>
      <button
        type="button"
        disabled={!ready}
        onClick={onBowl}
        className="min-h-12 rounded-full bg-brass px-6 py-3 font-display text-2xl text-ink disabled:opacity-50"
      >
        Let's bowl
      </button>
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <p className="tabular-nums">
          {strings > 0 ? `${strings} string${strings === 1 ? "" : "s"} · best ${best}` : "No sign-up. Just a string."}
        </p>
        <button type="button" className="min-h-11 px-2 text-brass" onClick={onRules}>
          How it works
        </button>
      </div>
    </div>
  );
}

function Result({ snap, onAgain, onDesk }: { snap: Snap; onAgain: () => void; onDesk: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div>
        <p className="text-xs font-semibold tracking-widest text-brass">STRING DONE</p>
        <p className="font-display text-6xl leading-none tabular-nums text-cream">{snap.finalScore}</p>
        <p className="mt-2 text-pretty text-cream-dim">{snap.blurb}</p>
        <p className="mt-1 text-sm text-muted">
          {snap.strikes} strike{snap.strikes === 1 ? "" : "s"} · {snap.spares} spare{snap.spares === 1 ? "" : "s"}
          {snap.newBest ? " · New house best" : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onAgain}
        className="min-h-12 rounded-full bg-brass px-6 py-3 font-display text-2xl text-ink"
      >
        Another string
      </button>
      <button type="button" onClick={onDesk} className="min-h-11 text-sm text-muted">
        Back to the desk
      </button>
    </div>
  );
}

function Controls({
  snap,
  meterRef,
  trackRef,
  onGuide,
  onRules,
}: {
  snap: Snap;
  meterRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  onGuide: () => void;
  onRules: () => void;
}) {
  const pinLabel = snap.standing === 10 ? "10 pins standing" : `${snap.standing} of 10 still up`;
  const hook =
    snap.spin < -0.35 ? " · hooking left" : snap.spin > 0.35 ? " · hooking right" : "";
  const status =
    snap.phase === "roll"
      ? "Ball's on its way"
      : snap.phase === "setter"
        ? "Setting a fresh rack"
        : snap.phase === "gap"
          ? snap.rackFull
            ? "Fresh rack coming"
            : `${pinLabel} · deadwood stays`
          : snap.phase === "meter"
            ? "Let go"
            : `Ball ${snap.ballNumber} of 3 · ${pinLabel}${hook}`;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-cream">{status}</p>
        <button type="button" className="min-h-11 shrink-0 px-1 text-sm text-brass" onClick={onRules}>
          Rules
        </button>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Soft</span>
          <span>{snap.metering ? "Let go" : "Push the ball up the lane"}</span>
          <span>Firm</span>
        </div>
        <div ref={trackRef} className="relative h-3 overflow-hidden rounded-full bg-bg-deep">
          <div className="power-band absolute inset-y-0 bg-brass/50" />
          <div ref={meterRef} className="meter-fill absolute inset-y-0 left-0 w-full bg-cream" />
        </div>
      </div>
      <p className="text-xs text-muted">
        Slide the ball to stand. Push it toward the pins and let go. Curve the push for a little hook.{" "}
        <button type="button" className="text-brass" onClick={onGuide}>
          {snap.guideOn ? "Hide the line" : "Show the line"}
        </button>
        <span className="hidden sm:inline"> · arrows move your feet · J L aim · hold space</span>
      </p>
    </div>
  );
}

function Rules({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-3 max-h-52 space-y-2 overflow-auto text-sm text-cream-dim">
      <p className="font-display text-lg text-cream">How a string works</p>
      <p>Ten frames. Three balls in each. The ball fits in your palm — no finger holes.</p>
      <p>Slide the ball sideways to stand. Push it up the lane and let go. A curved push hooks the ball.</p>
      <p>
        <span className="text-cream">Strike.</span> All ten on the first ball. Your next two balls get added on.
      </p>
      <p>
        <span className="text-cream">Spare.</span> Clear the rest with the second ball. Your next ball gets added on.
      </p>
      <p>
        <span className="text-cream">Third ball.</span> It only counts what it knocks down. No bonus — still worth
        throwing.
      </p>
      <p>
        <span className="text-cream">Deadwood stays.</span> Pins that fall and don't reach the gutter stay on the lane.
        Use them. Clip the wood into the ones still standing.
      </p>
      <p>In the tenth, a strike or a spare sets the pins back up so you can finish the bonuses.</p>
      <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-brass px-5 text-ink">
        Got it
      </button>
    </div>
  );
}
