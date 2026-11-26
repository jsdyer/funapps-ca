import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Anchor, Compass, Fish, Pause, Play, Star, Volume2, VolumeX } from "lucide-react";
import { mountGame } from "@/game/engine";
import type { GameApi, LobsterKind, UiSnapshot } from "@/game/types";

const INITIAL: UiSnapshot = {
  phase: "title",
  bell: 120,
  grace: false,
  hold: [],
  holdMax: 8,
  pounds: 0,
  orderLb: 16,
  price: 8,
  canHaul: false,
  haulReason: "none",
  canDock: false,
  hint: "",
  bumps: 0,
  combo: 0,
  sound: true,
  calm: false,
  bestLb: 0,
  bestPay: 0,
  mornings: 0,
  payday: null,
  potsLeft: 8,
  potTotal: 8,
};

export function HarbourGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const api = useRef<GameApi | null>(null);
  const [ui, setUi] = useState<UiSnapshot>(INITIAL);
  const [coarse, setCoarse] = useState(false);
  const touch = useRef({ left: false, right: false, ahead: false, back: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = mountGame(canvas, setUi);
    api.current = game;
    return () => game.destroy();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(pointer: coarse), (max-width: 800px)");
    const apply = () => setCoarse(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  function syncTouch() {
    const pad = touch.current;
    let steer = 0;
    let throttle = 0;
    if (pad.left) steer += 1;
    if (pad.right) steer -= 1;
    if (pad.ahead) throttle += 1;
    if (pad.back) throttle -= 1;
    api.current?.setTouch(steer, throttle);
  }

  function hold(key: keyof typeof touch.current) {
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        touch.current[key] = true;
        syncTouch();
      },
      onPointerUp: () => {
        touch.current[key] = false;
        syncTouch();
      },
      onPointerCancel: () => {
        touch.current[key] = false;
        syncTouch();
      },
    };
  }

  const playing = ui.phase === "playing" || ui.phase === "paused";
  const orderPct = Math.max(0, Math.min(100, (ui.pounds / ui.orderLb) * 100));

  return (
    <main className="relative h-dvh w-full select-none overflow-hidden bg-harbour-deep text-ink">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" aria-hidden />

      {playing && (
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
          <div className="pointer-events-auto rounded-2xl bg-card/95 px-3 py-2 shadow-lg">
            <div className="flex gap-1">
              {Array.from({ length: ui.holdMax }, (_, index) => {
                const lobster = ui.hold[index];
                return (
                  <span
                    key={index}
                    className={`h-3 w-3 rounded-full ${lobster ? pipClass(lobster.kind) : "bg-line"}`}
                  />
                );
              })}
            </div>
            <p className="mt-1 text-sm font-medium">
              {ui.pounds.toFixed(1)} lb
              <span className="text-harbour"> · {ui.potsLeft} pots left</span>
            </p>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-line">
              <div className="h-full bg-buoy" style={{ width: `${orderPct}%` }} />
            </div>
            <p className="text-xs text-harbour">Order {ui.orderLb} lb</p>
          </div>

          <div className="pointer-events-none rounded-full bg-harbour/90 px-4 py-2 text-center text-foam shadow-lg">
            <p className="text-xs tracking-wide">{ui.grace ? "Head in" : "Bell"}</p>
            <p className="font-display text-xl leading-none">{clock(ui.bell)}</p>
          </div>

          <div className="pointer-events-auto flex gap-2">
            <IconButton label={ui.sound ? "Mute" : "Sound on"} onClick={() => api.current?.toggleSound()}>
              {ui.sound ? <Volume2 /> : <VolumeX />}
            </IconButton>
            <IconButton label={ui.phase === "paused" ? "Resume" : "Pause"} onClick={() => api.current?.togglePause()}>
              {ui.phase === "paused" ? <Play /> : <Pause />}
            </IconButton>
          </div>
        </header>
      )}

      {ui.phase === "title" && (
        <div className="absolute inset-0 z-20 flex items-end justify-start p-3 md:items-center md:p-10">
          <section className="w-full max-w-md rounded-3xl bg-card/95 p-6 shadow-xl">
            <p className="text-sm font-medium tracking-wide text-harbour">Shelburne, Nova Scotia</p>
            <h1 className="font-display text-5xl leading-none text-ink">Bring ’em in</h1>
            <p className="mt-3 text-base text-harbour">
              A short morning on the lobster boat. Haul your red buoys, then bring the crate home to Government Wharf.
            </p>
            <ol className="mt-5 space-y-3">
              <Rule icon={<Compass />} text="Steer out to the red-and-yellow buoys." />
              <Rule icon={<Anchor />} text="Slow down beside one and haul." />
              <Rule icon={<Fish />} text="Bring the crate back before the bell." />
            </ol>
            <button
              className="mt-6 min-h-14 w-full rounded-full bg-buoy px-6 text-lg font-semibold text-foam"
              onClick={() => api.current?.start()}
            >
              Start the morning
            </button>
            <div className="mt-4 flex items-center justify-between text-sm text-harbour">
              <span>
                {ui.mornings > 0 ? `Best ${ui.bestLb.toFixed(1)} lb · $${ui.bestPay}` : "First morning out"}
              </span>
              <button className="min-h-11 rounded-full px-3 font-medium" onClick={() => api.current?.toggleSound()}>
                {ui.sound ? "Sound on" : "Sound off"}
              </button>
            </div>
          </section>
        </div>
      )}

      {ui.phase === "playing" && (
        <div className="safe-pad absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-3">
          <p
            className="mx-auto max-w-md rounded-full bg-harbour/92 px-4 py-2 text-center text-sm text-foam"
            aria-live="polite"
          >
            {ui.hint}
            {!coarse && <span className="mt-0.5 block text-xs text-mist">A left · D right · W ahead · Space haul · E tie up</span>}
          </p>
          <div className="flex items-end gap-3">
            {coarse && (
              <div className="grid grid-cols-3 gap-2">
                <span />
                <Pad label="Ahead" {...hold("ahead")} />
                <span />
                <Pad label="Left" {...hold("left")} />
                <Pad label="Back" {...hold("back")} />
                <Pad label="Right" {...hold("right")} />
              </div>
            )}
            <div className="ml-auto flex gap-2">
              {ui.canDock && (
                <button
                  className="min-h-14 rounded-full bg-sand px-5 text-base font-semibold text-ink"
                  onClick={() => api.current?.dock()}
                >
                  Tie up
                </button>
              )}
              <button
                className={`min-h-14 rounded-full px-6 text-base font-semibold text-foam ${ui.canHaul ? "haul-pulse bg-buoy" : "bg-harbour/80"}`}
                disabled={!ui.canHaul}
                onClick={() => api.current?.haul()}
              >
                {ui.canHaul ? "Haul" : haulLabel(ui.haulReason)}
              </button>
            </div>
          </div>
        </div>
      )}

      {ui.phase === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-harbour-deep/55 p-4">
          <section className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
            <h2 className="font-display text-3xl">Paused</h2>
            <p className="mt-2 text-harbour">Red buoys are yours. Blue ones are not. Slow down, haul, bring the crate to the wharf.</p>
            <button className="mt-4 min-h-11 text-sm font-medium text-harbour" onClick={() => api.current?.toggleCalm()}>
              {ui.calm ? "Motion: gentle" : "Motion: lively"}
            </button>
            <button
              className="mt-4 min-h-12 w-full rounded-full bg-harbour text-foam"
              onClick={() => api.current?.togglePause()}
            >
              Keep fishing
            </button>
          </section>
        </div>
      )}

      {ui.phase === "payday" && ui.payday && (
        <div className="absolute inset-0 z-30 flex items-end justify-center bg-harbour-deep/35 p-3 md:items-center">
          <section className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
            <p className="text-sm font-medium text-harbour">{ui.payday.towed ? "Towed home" : "You brought them in"}</p>
            <h2 className="font-display text-4xl leading-none">
              {ui.payday.count} {ui.payday.count === 1 ? "lobster" : "lobsters"}
            </h2>
            <p className="mt-3 text-lg">
              {ui.payday.pounds.toFixed(1)} lb at ${ui.price}/lb
              {ui.payday.bonus > 0 ? ` · string bonus $${ui.payday.bonus}` : ""}
            </p>
            <p className="font-display text-3xl text-harbour">Wharf paid ${ui.payday.pay}</p>
            <div className="mt-3 flex gap-1" aria-label={`${ui.payday.stars} of 3 stars`}>
              {[0, 1, 2].map((index) => (
                <Star key={index} className={index < ui.payday!.stars ? "fill-sand text-sand" : "text-line"} />
              ))}
            </div>
            <p className="mt-2 text-harbour">{ui.payday.line}</p>
            <p className="mt-1 text-sm text-harbour">
              Best morning {Math.max(ui.bestLb, ui.payday.pounds).toFixed(1)} lb · ${Math.max(ui.bestPay, ui.payday.pay)}
            </p>
            <button
              className="mt-5 min-h-14 w-full rounded-full bg-buoy text-lg font-semibold text-foam"
              onClick={() => api.current?.again()}
            >
              Another morning
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function Rule({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-harbour text-foam [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-lg [&_svg]:h-5 [&_svg]:w-5"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Pad({
  label,
  ...handlers
}: {
  label: string;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}) {
  return (
    <button
      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card/95 text-xs font-semibold text-ink shadow-lg"
      {...handlers}
    >
      {label}
    </button>
  );
}

function pipClass(kind: LobsterKind) {
  if (kind === "jumbo") return "bg-sand";
  if (kind === "small") return "bg-harbour";
  return "bg-buoy";
}

function haulLabel(reason: UiSnapshot["haulReason"]) {
  if (reason === "fast") return "Slow down";
  if (reason === "full") return "Full";
  if (reason === "busy") return "Hauling";
  if (reason === "blue") return "Not yours";
  return "Haul";
}

function clock(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${mins}:${rest.toString().padStart(2, "0")}`;
}
