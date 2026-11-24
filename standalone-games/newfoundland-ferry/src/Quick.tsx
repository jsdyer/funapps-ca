import { useEffect, useRef, useState } from "react";
import {
  createRush,
  startRush,
  pauseRush,
  resumeRush,
  loadLane,
  tickRush,
  TARGET,
  ROUND_SECONDS,
} from "./rush-engine";
import type { Run } from "./rush-engine";
import "./quick.css";
const paints = ["#ffb55c", "#7ee5de", "#d8a4f5"];
const names = ["Triangle", "Circle", "Square"];
const symbols = ["▲", "●", "■"];
function Mark({
  lane,
  x = 0,
  y = 0,
  size = 17,
}: {
  lane: number;
  x?: number;
  y?: number;
  size?: number;
}) {
  return (
    <text
      x={x}
      y={y + size * 0.35}
      textAnchor="middle"
      fill="#133a4c"
      fontSize={size}
      fontWeight="900"
    >
      {symbols[lane]}
    </text>
  );
}
function Car({
  lane,
  x,
  y,
  scale = 1,
}: {
  lane: number;
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-28" y="-24" width="56" height="15" rx="4" fill="#132f40" />
      <rect x="-28" y="18" width="56" height="15" rx="4" fill="#132f40" />
      <rect
        x="-23"
        y="-43"
        width="46"
        height="85"
        rx="14"
        fill={paints[lane]}
        stroke="#fff2d5"
        strokeWidth="3"
      />
      <path d="M-18-23Q0-31 18-23L15-6H-15Z" fill="#264f63" />
      <rect x="-14" y="25" width="28" height="8" rx="3" fill="#264f63" />
      <rect x="-16" y="-38" width="9" height="4" fill="#fffbd7" />
      <rect x="7" y="-38" width="9" height="4" fill="#fffbd7" />
      <Mark lane={lane} y={11} size={22} />
    </g>
  );
}
function readBest() {
  try {
    const n = Number(localStorage.getItem("ferry-rush-best"));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}
export default function Quick() {
  const state = useRef<Run>(createRush());
  const [s, setS] = useState(state.current);
  const [demo, setDemo] = useState(0);
  const [best, setBest] = useState(readBest);
  const last = useRef<number | null>(null);
  const reduced = useRef(
    matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const game = useRef<HTMLDivElement>(null);
  function change(next: Run) {
    state.current = next;
    setS(next);
  }
  function start() {
    last.current = null;
    change(startRush());
    game.current?.focus({ preventScroll: true });
  }
  function choose(lane: number) {
    if (state.current.phase === "ready") start();
    else change(loadLane(state.current, lane));
  }
  function pause() {
    change(pauseRush(state.current));
  }
  function resume() {
    last.current = null;
    change(resumeRush(state.current));
    game.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    let raf = 0,
      dt = 0;
    const frame = (t: number) => {
      dt = last.current === null ? 0 : Math.min(0.1, (t - last.current) / 1000);
      last.current = t;
      if (state.current.phase === "ready") {
        if (!reduced.current) setDemo((d) => d + dt);
      } else if (
        state.current.phase === "playing" ||
        state.current.phase === "sailing"
      )
        change(tickRush(state.current, dt));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onKey = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        (e.target as HTMLElement).closest("input,textarea,select")
      )
        return;
      if (/^[123]$/.test(e.key)) {
        e.preventDefault();
        if (!e.repeat) choose(Number(e.key) - 1);
      } else if (e.key.toLowerCase() === "p" || e.key === "Escape") {
        e.preventDefault();
        if (e.repeat) return;
        if (state.current.phase === "paused") resume();
        else pause();
      } else if (
        e.code === "Space" &&
        !(e.target as HTMLElement).closest("button,a,summary")
      ) {
        e.preventDefault();
        if (e.repeat) return;
        if (state.current.phase === "ready") start();
        else if (state.current.phase === "paused") resume();
        else pause();
      }
    };
    const onHidden = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);
  useEffect(() => {
    if (s.phase === "arrived" || s.phase === "ended") {
      const n = Math.max(best, s.score);
      setBest(n);
      try {
        localStorage.setItem("ferry-rush-best", String(n));
      } catch {}
    }
  }, [s.phase]);
  const ready = s.phase === "ready",
    paused = s.phase === "paused",
    finished = s.phase === "arrived" || s.phase === "ended",
    departing =
      s.phase === "sailing" ||
      s.phase === "arrived" ||
      (paused && s.resumePhase === "sailing");
  const car = ready
    ? {
        lane: Math.floor(demo / 4) % 3,
        remaining: 7 - (demo % 4) * 1.6,
        duration: 7,
      }
    : s.current;
  const highlight = car?.lane ?? null;
  const laneCount = (lane: number) =>
    s.loaded.filter((c) => c.lane === lane).length;
  return (
    <div className={`rush-app ${paused ? "is-paused" : ""}`}>
      <header className="rush-top">
        <a href="https://funapps.ca/">FUNAPPS</a>
        <h1>
          Newfoundland <span>Ferry</span>
        </h1>
        <button
          onClick={paused ? resume : pause}
          disabled={ready || finished}
          aria-label={paused ? "Resume game" : "Pause game"}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      </header>
      <main className="rush-main">
        <div className="rush-hud">
          <div>
            <strong>
              {s.loaded.length}/{TARGET}
            </strong>
            <span>ABOARD</span>
          </div>
          <p>
            North Sydney <span>→</span> Newfoundland
          </p>
          <div>
            <strong>{Math.ceil(ROUND_SECONDS - s.elapsed)}</strong>
            <span>SEC</span>
          </div>
          <div>
            <strong>{s.score}</strong>
            <span>POINTS</span>
          </div>
        </div>
        <div
          className="rush-stage"
          ref={game}
          tabIndex={0}
          role="application"
          aria-label="Ferry boarding game. Match each car's symbol to lane 1, 2 or 3."
        >
          <svg
            viewBox="0 0 900 560"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="rushsea" x2="0" y2="1">
                <stop stopColor="#38a5bd" />
                <stop offset="1" stopColor="#12657d" />
              </linearGradient>
              <pattern
                id="rushwaves"
                width="100"
                height="85"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M8 28q14-10 28 0t28 0m-1 42q14-8 28 0"
                  stroke="#94e4e7"
                  fill="none"
                  strokeWidth="2"
                  opacity=".45"
                />
              </pattern>
            </defs>
            <rect width="900" height="560" fill="url(#rushsea)" />
            <rect
              className="rush-waves"
              x="-100"
              width="1100"
              height="560"
              fill="url(#rushwaves)"
            />
            <path
              d="M680 0H900V164L856 128 796 149 746 98 692 88Z"
              fill="#236259"
            />
            <path d="m695 0 44 64 78 40 83-9V0" fill="#47815e" />
            {[0, 1, 2, 3].map((v) => (
              <g
                key={v}
                transform={`translate(${733 + v * 39} ${40 + v * 16})`}
              >
                <rect
                  width="29"
                  height="39"
                  fill={["#ee7d64", "#f9d26a", "#bddab7", "#e7a2c2"][v]}
                />
                <path d="M-4 0 14-14 33 0" fill="#12384c" />
                <rect x="5" y="9" width="7" height="10" fill="#1b4961" />
                <rect x="19" y="9" width="7" height="10" fill="#1b4961" />
              </g>
            ))}
            <text
              x="785"
              y="163"
              textAnchor="middle"
              fill="#fff3dc"
              fontSize="14"
              fontWeight="800"
            >
              NEWFOUNDLAND
            </text>
            <g className={`rush-ferry ${departing ? "departing" : ""}`}>
              <path
                d="M243 90Q450-42 657 90L649 354Q450 395 251 354Z"
                fill="#10384d"
              />
              <path
                d="M262 94Q450-16 638 94L630 340Q450 368 270 340Z"
                fill="#fffae5"
              />
              <path d="M301 70Q450 2 599 70V112H301Z" fill="#dce8de" />
              <path
                d="M317 71Q450 16 583 71"
                stroke="#2b6474"
                strokeWidth="19"
                fill="none"
              />
              <rect
                x="430"
                y="42"
                width="40"
                height="30"
                rx="4"
                fill="#f57c58"
              />
              <rect
                x="294"
                y="121"
                width="312"
                height="217"
                rx="15"
                fill="#bdc8bb"
              />
              {[0, 1, 2].map((l) => (
                <g key={l}>
                  <rect
                    x={300 + l * 102}
                    y="126"
                    width="96"
                    height="205"
                    rx="10"
                    fill={paints[l]}
                    opacity={highlight === l ? ".8" : ".35"}
                    stroke={highlight === l ? "#fffde5" : "#819a91"}
                    strokeWidth={highlight === l ? 4 : 1}
                  />
                  <Mark lane={l} x={348 + l * 102} y={146} size={23} />
                  {s.loaded
                    .filter((c) => c.lane === l)
                    .map((c, i) => (
                      <Car
                        key={c.id}
                        lane={l}
                        x={348 + l * 102}
                        y={180 + i * 43}
                        scale={0.45}
                      />
                    ))}
                </g>
              ))}
              <path
                d="M408 342H492L505 394H395Z"
                fill="#f9df9e"
                stroke="#123c4f"
                strokeWidth="4"
              />
              <path
                d="M420 351 412 387M440 351 438 387M460 351 462 387M480 351 488 387"
                stroke="#bd9854"
                strokeWidth="4"
              />
              <text
                x="450"
                y="106"
                textAnchor="middle"
                fill="#234e5b"
                fontSize="16"
                fontWeight="800"
              >
                THE NEXT ADVENTURE
              </text>
            </g>
            <path d="M372 560V399H528V560" fill="#4e5f69" />
            <path
              d="M450 560V415"
              stroke="#faf2c9"
              strokeWidth="4"
              strokeDasharray="18 15"
            />
            <path
              d="M374 560V402M526 560V402"
              stroke="#d7d9c6"
              strokeWidth="6"
            />
            {car && !departing && (
              <g>
                <path
                  d={`M450 394Q${450 + (car.lane - 1) * 80} 365 ${348 + car.lane * 102} 321`}
                  stroke={paints[car.lane]}
                  strokeWidth="7"
                  strokeDasharray="9 9"
                  fill="none"
                  opacity=".9"
                />
                <Car
                  lane={car.lane}
                  x={450}
                  y={420 + (car.remaining / car.duration) * 95}
                  scale={0.87}
                />
                <circle
                  cx="547"
                  cy="469"
                  r="27"
                  fill={paints[car.lane]}
                  stroke="#fff7da"
                  strokeWidth="3"
                />
                <Mark lane={car.lane} x={547} y={469} size={28} />
              </g>
            )}
            <g fill="none" stroke="#133d4c" strokeWidth="3">
              <path d="M85 78q9-10 18 0q9-10 18 0M139 114q7-8 14 0q7-8 14 0" />
            </g>
          </svg>
          {ready && (
            <div className="rush-start">
              <span className="tiny-label">BOARDING RUSH</span>
              <h2>Cars are coming!</h2>
              <p>
                Tap the matching lane.
                <br />
                Get 12 aboard and sail.
              </p>
              <button className="rush-primary" onClick={start}>
                Start boarding
              </button>
            </div>
          )}
          {paused && (
            <div className="rush-overlay">
              <div className="rush-card">
                <h2>Holding the ramp.</h2>
                <p>Your crossing is paused.</p>
                <button className="rush-primary" onClick={resume}>
                  Resume boarding
                </button>
              </div>
            </div>
          )}
          {finished && (
            <div className="rush-overlay">
              <div className="rush-card">
                <span className="tiny-label">
                  {s.phase === "arrived"
                    ? "WELCOME TO NEWFOUNDLAND"
                    : "DEPARTURE TIME"}
                </span>
                <h2>
                  {s.phase === "arrived"
                    ? "All aboard. All ashore."
                    : "Next ferry, new chances."}
                </h2>
                <strong className="rush-score">{s.score} points</strong>
                <p>
                  {s.loaded.length} vehicles aboard · Best {best}
                </p>
                <button className="rush-primary" onClick={start}>
                  Board another ferry
                </button>
              </div>
            </div>
          )}
          {s.phase === "sailing" && (
            <div className="rush-crossing">
              <h2>Next stop: Newfoundland!</h2>
              <p>All 12 aboard. Enjoy the crossing.</p>
            </div>
          )}
          <div className="rush-feedback" aria-live="polite">
            {s.flash > 0 ? s.feedback : ""}
          </div>
        </div>
        <div
          className="rush-lanes"
          role="group"
          aria-label="Choose the matching lane"
        >
          {[0, 1, 2].map((l) => (
            <button
              key={l}
              className={`${highlight === l ? "target" : ""} ${s.wrong === l && s.flash > 0 ? "wrong" : ""}`}
              onClick={() => choose(l)}
              disabled={!ready && s.phase !== "playing"}
              style={{ "--lane": paints[l] } as React.CSSProperties}
              aria-label={`Lane ${l + 1}, ${names[l]}`}
            >
              <span className="lane-symbol" aria-hidden="true">
                {symbols[l]}
              </span>
              <span>
                <b>Lane {l + 1}</b>
                <small>{names[l]}</small>
              </span>
              <kbd>{l + 1}</kbd>
              <span className="loaded-count" aria-hidden="true">
                {laneCount(l)}/4
              </span>
            </button>
          ))}
        </div>
        <p className="rush-cue" aria-live="polite">
          {car
            ? `${symbols[car.lane]} ${names[car.lane]} car · Lane ${car.lane + 1}. `
            : "Get ready for the next car. "}
          <b>Tap a lane or press 1, 2, 3.</b>
        </p>
        <footer className="rush-footer">
          <a href="?mode=puzzles">Deck puzzles</a>
          <span>React + SVG</span>
          <details>
            <summary>About the crossing</summary>
            <p>
              A playful boarding rush inspired by the North Sydney–Port aux
              Basques route. Vehicles, lanes and timing are fictional.{" "}
              <a
                href="https://www.marineatlantic.ca/sailing-information/sailing-routes"
                target="_blank"
                rel="noopener"
              >
                Explore the real ferry route.
              </a>
            </p>
          </details>
        </footer>
      </main>
    </div>
  );
}
