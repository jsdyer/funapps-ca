import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  canSail,
  difference,
  laneNames,
  manifests,
  medal,
  placementError,
  solve,
  usage,
  weight,
} from "./engine";
import type { Board, Vehicle } from "./engine";
import "./style.css";

function VehicleArt({
  v,
  x = 0,
  y = 0,
  w = 42,
  h = 70,
}: {
  v: Vehicle;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-3}
        y={h * 0.2}
        width={w + 6}
        height={h * 0.17}
        rx="3"
        fill="#223e42"
      />
      <rect
        x={-3}
        y={h * 0.67}
        width={w + 6}
        height={h * 0.17}
        rx="3"
        fill="#223e42"
      />
      <rect
        width={w}
        height={h}
        rx={v.kind === "car" ? 10 : 5}
        fill={v.color}
        stroke="#fff8e8"
        strokeWidth="1.5"
      />
      <path
        d={`M5 ${h * 0.22} Q${w / 2} ${h * 0.15} ${w - 5} ${h * 0.22} L${w - 6} ${h * 0.37} H6Z`}
        fill="#294d56"
      />
      <rect
        x="7"
        y={h * 0.76}
        width={w - 14}
        height={h * 0.09}
        rx="2"
        fill="#294d56"
      />
      {v.kind === "truck" && (
        <path
          d={`M2 ${h * 0.4} H${w - 2} M7 ${h * 0.48} V${h * 0.68} M14 ${h * 0.48} V${h * 0.68} M21 ${h * 0.48} V${h * 0.68} M28 ${h * 0.48} V${h * 0.68}`}
          stroke="#fff8e8"
          opacity=".4"
        />
      )}
      {v.kind === "camper" && (
        <rect
          x={w / 2 - 7}
          y={h * 0.47}
          width="14"
          height={h * 0.2}
          rx="3"
          fill="#e8dec9"
        />
      )}
      <path
        d={`M5 5 H11 M${w - 11} 5 H${w - 5}`}
        stroke="#fff2c2"
        strokeWidth="3"
      />
    </g>
  );
}
function SeaScene({ arrived = false }: { arrived?: boolean }) {
  return (
    <svg
      viewBox="0 0 800 310"
      className="sea-scene"
      role="img"
      aria-label={
        arrived
          ? "A ferry arriving at a colourful Newfoundland harbour"
          : "Ferry crossing the water toward Newfoundland"
      }
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#c8deda" />
          <stop offset="1" stopColor="#f7dec2" />
        </linearGradient>
      </defs>
      <rect width="800" height="310" fill="url(#sky)" />
      <circle cx="640" cy="70" r="33" fill="#f6cc8f" />
      <path
        d="M0 165L50 128 94 143 138 109 198 153 247 137 297 167 380 130 441 154 500 120 563 156 629 110 700 144 759 123 800 160V240H0Z"
        fill="#89a6a0"
      />
      <path
        d="M0 190L56 163 117 182 192 157 247 188 340 173 388 194 484 164 543 185 621 155 686 177 743 150 800 175V240H0Z"
        fill="#587f79"
      />
      <rect y="210" width="800" height="100" fill="#4d9197" />
      <path
        d="M0 230H160M260 242H420M540 225H720M40 274H250M370 280H610M670 265H800"
        stroke="#b2d2cc"
        strokeWidth="3"
        opacity=".5"
      />
      {[580, 618, 659, 698, 738].map((x, i) => (
        <g key={x}>
          <rect
            x={x}
            y={180 - (i % 2) * 10}
            width="29"
            height="35"
            fill={["#d5755a", "#e8c777", "#abc1c1", "#d5755a", "#e7dfc7"][i]}
          />
          <path
            d={`M${x - 4} ${180 - (i % 2) * 10}l18-15 19 15Z`}
            fill="#38575b"
          />
          <rect
            x={x + 7}
            y={190 - (i % 2) * 10}
            width="6"
            height="8"
            fill="#24464e"
          />
          <rect
            x={x + 18}
            y={190 - (i % 2) * 10}
            width="6"
            height="8"
            fill="#24464e"
          />
        </g>
      ))}
      <g className={arrived ? "ship arrived" : "ship"}>
        <path d="M200 235H420L400 259H224Z" fill="#173d45" />
        <path d="M211 212H390L410 235H200Z" fill="#fcf3db" />
        <rect x="245" y="192" width="104" height="20" rx="3" fill="#fcf3db" />
        <rect x="305" y="178" width="19" height="14" fill="#d87558" />
        {[230, 252, 274, 296, 318, 340, 362].map((x) => (
          <rect key={x} x={x} y="219" width="11" height="7" fill="#4c7c83" />
        ))}
        <path d="M242 203H337" stroke="#4c7c83" strokeWidth="5" />
        <path
          d="M187 260Q226 269 268 260M168 269Q208 277 241 270"
          stroke="#d8e6da"
          strokeWidth="3"
          fill="none"
        />
      </g>
      <path
        d="M82 65q8-9 16 0q8-9 16 0M130 95q6-7 12 0q6-7 12 0"
        stroke="#365e63"
        fill="none"
        strokeWidth="2"
      />
    </svg>
  );
}
function readProgress(): number[] {
  try {
    const p = JSON.parse(localStorage.getItem("funapps-ferry-medals") || "[]");
    return manifests.map((_, i) =>
      Array.isArray(p) && Number.isInteger(p[i]) && p[i] >= 0 && p[i] <= 3
        ? p[i]
        : 0,
    );
  } catch {
    return manifests.map(() => 0);
  }
}
function App() {
  const [level, setLevel] = useState(0),
    [board, setBoard] = useState<Board>({}),
    [history, setHistory] = useState<Board[]>([]),
    [selected, setSelected] = useState<string | null>("a"),
    [moves, setMoves] = useState(0),
    [hints, setHints] = useState(0),
    [message, setMessage] = useState(
      "Choose a vehicle below, then a lane on the ferry.",
    ),
    [phase, setPhase] = useState<"loading" | "crossing" | "arrived">("loading"),
    [progress, setProgress] = useState(readProgress),
    [help, setHelp] = useState(false);
  const m = manifests[level],
    current = m.vehicles.find((v) => v.id === selected),
    count = Object.keys(board).length,
    ready = canSail(m, board),
    gap = difference(m, board);
  function reset(index = level) {
    setLevel(index);
    setBoard({});
    setHistory([]);
    setSelected(manifests[index].vehicles[0].id);
    setMoves(0);
    setHints(0);
    setMessage(
      "Choose a vehicle, then a lane. You can return any vehicle to the queue.",
    );
    setPhase("loading");
  }
  function load(lane: number) {
    if (phase !== "loading") return;
    if (!current) {
      setMessage("Choose a waiting vehicle first.");
      return;
    }
    const error = placementError(m, board, current, lane);
    if (error) {
      setMessage(error);
      return;
    }
    const next = { ...board, [current.id]: lane };
    setHistory([...history, board]);
    setBoard(next);
    setMoves(moves + 1);
    setSelected(m.vehicles.find((v) => next[v.id] === undefined)?.id ?? null);
    setMessage(
      canSail(m, next)
        ? "All aboard and balanced. You’re ready to sail!"
        : `${current.name} is aboard in ${laneNames[lane]}. ${m.vehicles.length - Object.keys(next).length} waiting.`,
    );
  }
  function unload(v: Vehicle) {
    if (phase !== "loading") return;
    const next = { ...board };
    delete next[v.id];
    setHistory([...history, board]);
    setBoard(next);
    setSelected(v.id);
    setMoves(moves + 1);
    setMessage(`${v.name} is back in the queue. Choose a different lane.`);
  }
  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setBoard(previous);
    setHistory(history.slice(0, -1));
    setSelected(
      m.vehicles.find((v) => previous[v.id] === undefined)?.id ?? null,
    );
    setMoves(moves + 1);
    setMessage("Last move undone. Try a different arrangement.");
  }
  function hint() {
    setHints(hints + 1);
    const solution = solve(m, board);
    if (!solution) {
      setMessage(
        "This arrangement cannot finish balanced. Return a vehicle to the queue or undo a move, then try again.",
      );
      return;
    }
    const v = m.vehicles.find((v) => board[v.id] === undefined);
    if (v) {
      setSelected(v.id);
      setMessage(
        `Harbour tip: put ${v.name.toLowerCase()} in ${laneNames[solution[v.id]]}.`,
      );
    } else setMessage("Your deck is ready. Time to sail!");
  }
  function sail() {
    if (!ready) return;
    setPhase("crossing");
    setMessage("Lines away. Next stop: Port aux Basques!");
  }
  function dock() {
    setPhase("arrived");
    const next = [...progress];
    next[level] = Math.max(next[level] || 0, medal(m, moves, hints));
    setProgress(next);
    try {
      localStorage.setItem("funapps-ferry-medals", JSON.stringify(next));
    } catch {
      /* Play still works without storage. */
    }
  }
  useEffect(() => {
    if (phase !== "crossing") return;
    const timer = setTimeout(dock, 4500);
    return () => clearTimeout(timer);
  }, [phase]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        phase !== "loading" ||
        help ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "A"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      const lane = Number(e.key) - 1;
      if (lane >= 0 && lane < 3) {
        e.preventDefault();
        load(lane);
      }
      if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board, selected, phase, history, help]);
  return (
    <div className="app">
      <header className="topbar">
        <a href="https://funapps.ca/" className="brand">
          FUNAPPS <span>/ MARITIME ARCADE</span>
        </a>
        <button
          onClick={() => setHelp(!help)}
          className="help-btn"
          aria-expanded={help}
        >
          How to play
        </button>
      </header>
      <main>
        <div className="heading">
          <div>
            <p className="eyebrow">NORTH SYDNEY · PORT AUX BASQUES</p>
            <h1>
              Last Ferry
              <br />
              <em>to Newfoundland.</em>
            </h1>
            <p className="intro">
              A deck full of little journeys. Find a place for everyone.
            </p>
          </div>
          <div className="stamp" aria-label="A five crossing puzzle">
            <span>5 CROSSINGS</span>
            <svg viewBox="0 0 80 50" aria-hidden="true">
              <path d="M6 30H74L62 43H17Z" fill="currentColor" />
              <path d="M19 17H59L67 28H12Z" fill="currentColor" />
              <path d="M30 7H48V16H30Z" fill="currentColor" />
            </svg>
            <span>DECKMASTER CLUB</span>
          </div>
        </div>
        {help && (
          <section className="help-panel">
            <div>
              <h2>Make room. Keep it balanced.</h2>
              <p>
                <strong>1.</strong> Pick a waiting vehicle. Its length is the
                number of deck squares it needs. Its load is its balance weight.
              </p>
              <p>
                <strong>2.</strong> Choose Port, Centre or Starboard to load it.
                Select a vehicle on the deck to return it to the queue. Undo and
                hints are always available.
              </p>
              <p>
                <strong>3.</strong> Load everyone, then keep the Port and
                Starboard load difference within the crossing’s limit. Centre
                load does not affect side balance. Sail to earn your harbour
                stamp.
              </p>
              <p>
                Use Tab and Enter throughout. When the page background has
                focus, 1 / 2 / 3 load the selected vehicle and U undoes a move.
                No dragging or time pressure.
              </p>
              <p className="small">
                Three stars: load everyone once, with no hints. Two stars: at
                most one hint and five extra moves. Every completed crossing
                earns a star.
              </p>
            </div>
            <button onClick={() => setHelp(false)}>Got it</button>
          </section>
        )}
        <nav className="voyages" aria-label="Choose a crossing">
          {manifests.map((v, i) => (
            <button
              key={v.title}
              aria-current={i === level ? "step" : undefined}
              onClick={() => reset(i)}
              disabled={phase === "crossing"}
            >
              <span className="voyage-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="voyage-title">{v.title}</span>
              <span
                className="stars"
                aria-label={`${progress[i] || 0} of 3 stars`}
              >
                {"★".repeat(progress[i] || 0)}
                {"☆".repeat(3 - (progress[i] || 0))}
              </span>
            </button>
          ))}
        </nav>
        {phase === "loading" ? (
          <div className="game-grid">
            <section className="queue-panel panel">
              <div className="section-heading">
                <span className="eyebrow">AT THE TERMINAL</span>
                <span className="count-pill">
                  {m.vehicles.length - count} waiting
                </span>
              </div>
              <h2>{m.title}</h2>
              <p className="muted">{m.subtitle}</p>
              <div className="queue">
                {m.vehicles
                  .filter((v) => board[v.id] === undefined)
                  .map((v) => (
                    <button
                      key={v.id}
                      className={`vehicle-card ${selected === v.id ? "selected" : ""}`}
                      onClick={() => {
                        setSelected(v.id);
                        setMessage(
                          `${v.name} selected. Choose a lane on the ferry.`,
                        );
                      }}
                      aria-pressed={selected === v.id}
                    >
                      <svg viewBox="0 0 60 84" aria-hidden="true">
                        <VehicleArt
                          v={v}
                          x={12}
                          y={7}
                          w={36}
                          h={v.length === 2 ? 60 : 72}
                        />
                      </svg>
                      <span>
                        <strong>{v.name}</strong>
                        <small>
                          <b>{v.length}</b> squares · <b>{v.weight}</b> load
                        </small>
                        {v.lanes && (
                          <small className="wide-tag">Centre lane only</small>
                        )}
                      </span>
                      <span className="selection-dot" aria-hidden="true" />
                    </button>
                  ))}
                {count === m.vehicles.length && (
                  <div className="empty-queue">
                    <span aria-hidden="true">✓</span>
                    <h3>Everyone’s aboard.</h3>
                    <p>
                      {ready
                        ? "A balanced deck and an open sea."
                        : "Check your side balance. Tap a loaded vehicle to move it."}
                    </p>
                  </div>
                )}
              </div>
              <div className="queue-footer">
                <span>{moves} moves</span>
                <span>
                  {hints} harbour {hints === 1 ? "tip" : "tips"}
                </span>
              </div>
            </section>
            <section
              className="deck-panel panel"
              aria-label="Ferry loading deck"
            >
              <div className="section-heading">
                <span className="eyebrow">M.V. LITTLE JOURNEYS</span>
                <span className="count-pill">
                  {count}/{m.vehicles.length} aboard
                </span>
              </div>
              <div className="lane-controls">
                {laneNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => load(i)}
                    disabled={!current}
                    aria-label={`Load ${current?.name ?? "selected vehicle"} in ${name} lane`}
                  >
                    <strong>{name}</strong>
                    <span>
                      {usage(m, board, i)} / {m.capacity[i]} squares
                    </span>
                  </button>
                ))}
              </div>
              <svg
                className="deck-svg"
                viewBox="0 0 450 570"
                role="group"
                aria-label="Top view of ferry deck. Activate a loaded vehicle to return it to the queue."
              >
                <defs>
                  <pattern
                    id="water"
                    width="70"
                    height="34"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M3 17q10-8 20 0t20 0t20 0"
                      fill="none"
                      stroke="#a8ceca"
                      strokeWidth="1.3"
                      opacity=".5"
                    />
                  </pattern>
                </defs>
                <rect width="450" height="570" rx="15" fill="#4f8f96" />
                <rect width="450" height="570" rx="15" fill="url(#water)" />
                <path
                  d="M225 18Q385 58 385 170V515Q225 562 65 515V170Q65 58 225 18Z"
                  fill="#143a42"
                  opacity=".25"
                  transform="translate(6 8)"
                />
                <path
                  d="M225 18Q385 58 385 170V515Q225 562 65 515V170Q65 58 225 18Z"
                  fill="#f4eacf"
                  stroke="#fff9e9"
                  strokeWidth="3"
                />
                <path d="M137 95Q225 42 313 95L325 126H125Z" fill="#2c626b" />
                <path
                  d="M151 92L160 112M181 80L186 109M210 73V108M240 74V108M268 82L265 110M296 93L289 112"
                  stroke="#f4eacf"
                  strokeWidth="5"
                />
                <text
                  x="225"
                  y="145"
                  textAnchor="middle"
                  fill="#3a6267"
                  fontSize="12"
                  fontWeight="700"
                  letterSpacing="2"
                >
                  BOW
                </text>
                {laneNames.map((name, lane) => {
                  const cell = 32,
                    top = 175,
                    max = 10,
                    cap = m.capacity[lane];
                  let offset = 0;
                  return (
                    <g key={name}>
                      {Array.from({ length: max }, (_, j) => (
                        <rect
                          key={j}
                          x={100 + lane * 88}
                          y={top + j * cell}
                          width="74"
                          height={cell - 3}
                          rx="3"
                          fill={j < cap ? "#d8ddcc" : "#b4b9a8"}
                          stroke={j < cap ? "#c0c8b7" : "#949f96"}
                          strokeDasharray={j < cap ? "0" : "3 3"}
                        />
                      ))}
                      {m.vehicles
                        .filter((v) => board[v.id] === lane)
                        .map((v) => {
                          const y = top + offset * cell + 3;
                          offset += v.length;
                          return (
                            <g
                              key={v.id}
                              tabIndex={0}
                              role="button"
                              aria-label={`Return ${v.name} from ${name} to queue`}
                              className="loaded-vehicle"
                              onClick={() => unload(v)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  unload(v);
                                }
                              }}
                            >
                              <title>{v.name} · select to unload</title>
                              <VehicleArt
                                v={v}
                                x={113 + lane * 88}
                                y={y}
                                w={48}
                                h={v.length * cell - 8}
                              />
                            </g>
                          );
                        })}
                    </g>
                  );
                })}
                <path
                  d="M167 513V541H283V513"
                  fill="#d0b575"
                  stroke="#fff3d2"
                  strokeWidth="2"
                />
                <path
                  d="M184 516V539M205 516V539M226 516V539M247 516V539M268 516V539"
                  stroke="#9f8b57"
                  strokeWidth="3"
                />
              </svg>
              <p className="deck-caption">
                Tap an aboard vehicle to return it to the queue.
              </p>
            </section>
            <aside className="dispatch-panel">
              <section className="panel balance-panel">
                <span className="eyebrow">THE BALANCE CHECK</span>
                <h2>{gap === 0 ? "Even keel." : `${gap} load apart.`}</h2>
                <div className="balance-scale" aria-hidden="true">
                  <div
                    className="beam"
                    style={{
                      transform: `rotate(${Math.max(-14, Math.min(14, (weight(m, board, 2) - weight(m, board, 0)) * 3))}deg)`,
                    }}
                  />
                  <span className="pivot" />
                </div>
                <div className="balance-values">
                  <div>
                    <strong>{weight(m, board, 0)}</strong>
                    <span>Port load</span>
                  </div>
                  <div>
                    <strong>{weight(m, board, 2)}</strong>
                    <span>Starboard load</span>
                  </div>
                </div>
                <p
                  className={`balance-status ${gap <= m.tolerance ? "good" : ""}`}
                >
                  {gap <= m.tolerance
                    ? "✓ Within departure limit"
                    : "Rebalance before departure"}
                </p>
                <p className="small">
                  Allowed difference: <strong>{m.tolerance}</strong>. Centre
                  load stays neutral. Balance matters when you sail.
                </p>
              </section>
              <section className="panel dispatch">
                <span className="eyebrow">HARBOUR DISPATCH</span>
                <div className="message" role="status" aria-live="polite">
                  {message}
                </div>
                <button className="sail-btn" onClick={sail} disabled={!ready}>
                  Sound the horn & sail
                </button>
                {!ready && (
                  <p className="small">
                    {count < m.vehicles.length
                      ? "Load every waiting vehicle to depart."
                      : "Move a vehicle to balance the outer lanes."}
                  </p>
                )}
                <div className="tools">
                  <button onClick={undo} disabled={!history.length}>
                    Undo
                  </button>
                  <button onClick={hint}>Harbour tip</button>
                  <button onClick={() => reset()}>Reset deck</button>
                </div>
              </section>
              <p className="tip-note">
                There’s no clock to race.
                <br />
                The sea can wait a moment.
              </p>
            </aside>
          </div>
        ) : (
          <section className="crossing panel">
            <div className="crossing-heading">
              <p className="eyebrow">
                {phase === "crossing"
                  ? "OUT ON THE CABOT STRAIT"
                  : "WELCOME TO NEWFOUNDLAND"}
              </p>
              <h2>
                {phase === "crossing"
                  ? "Lines away. Island ahead."
                  : "You made room for everyone."}
              </h2>
              <p>
                {phase === "crossing"
                  ? "A little salt air before the next puzzle."
                  : `${m.vehicles.length} vehicles delivered. A fine day’s work at the harbour.`}
              </p>
            </div>
            <SeaScene arrived={phase === "arrived"} />
            {phase === "arrived" ? (
              <div className="arrival">
                <div
                  className="arrival-stars"
                  aria-label={`${medal(m, moves, hints)} of 3 stars`}
                >
                  {"★".repeat(medal(m, moves, hints))}
                  {"☆".repeat(3 - medal(m, moves, hints))}
                </div>
                <p>
                  {moves} moves · {hints} harbour tips ·{" "}
                  <strong>
                    {gap === 0
                      ? "perfectly balanced"
                      : `${gap} load difference`}
                  </strong>
                </p>
                {level === manifests.length - 1 && (
                  <p className="final-note">
                    {progress.every(Boolean)
                      ? "All five crossings completed. You’re a certified Little Journeys deckmaster."
                      : "The final manifest is delivered. Visit the other crossings to collect every harbour stamp."}
                  </p>
                )}
                <div className="arrival-actions">
                  <button onClick={() => reset()} className="secondary">
                    Replay crossing
                  </button>
                  <button onClick={() => reset((level + 1) % manifests.length)}>
                    {level === manifests.length - 1
                      ? "Back to first crossing"
                      : "Next crossing"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="crossing-progress">
                <span className="crossing-track" />
                <button onClick={dock} className="secondary">
                  Skip to arrival
                </button>
              </div>
            )}
          </section>
        )}
        <footer>
          <span>
            A fictional ferry puzzle inspired by a real Atlantic crossing.
          </span>
          <a
            href="https://www.marineatlantic.ca/sailing-information/sailing-routes"
            target="_blank"
            rel="noreferrer"
          >
            Explore the real route
          </a>
          <span>Built with React + SVG</span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
