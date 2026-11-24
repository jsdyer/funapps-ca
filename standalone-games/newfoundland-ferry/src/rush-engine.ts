export const TARGET = 12,
  ROUND_SECONDS = 60;
export type Phase =
  | "ready"
  | "playing"
  | "paused"
  | "sailing"
  | "arrived"
  | "ended";
export type Car = {
  id: number;
  lane: number;
  remaining: number;
  duration: number;
};
export type Run = {
  phase: Phase;
  resumePhase: "playing" | "sailing";
  elapsed: number;
  sailing: number;
  serial: number;
  current: Car | null;
  loaded: Car[];
  delay: number;
  score: number;
  combo: number;
  missed: number;
  feedback: string;
  flash: number;
  wrong: number | null;
};
export function createRush(): Run {
  return {
    phase: "ready",
    resumePhase: "playing",
    elapsed: 0,
    sailing: 0,
    serial: 0,
    current: null,
    loaded: [],
    delay: 0,
    score: 0,
    combo: 0,
    missed: 0,
    feedback: "Match the car to its lane.",
    flash: 0,
    wrong: null,
  };
}
const sequence = [0, 1, 2, 1, 0, 2, 2, 0, 1, 0, 2, 1];
export function nextCar(s: Run): Run {
  const duration = Math.max(4.5, 7 - s.loaded.length * 0.12),
    preferred = sequence[s.serial % sequence.length];
  const lane =
    [preferred, (preferred + 1) % 3, (preferred + 2) % 3].find(
      (l) => s.loaded.filter((c) => c.lane === l).length < 4,
    ) ?? preferred;
  return {
    ...s,
    serial: s.serial + 1,
    current: { id: s.serial, lane, remaining: duration, duration },
  };
}
export function startRush(): Run {
  return nextCar({ ...createRush(), phase: "playing" });
}
export function pauseRush(s: Run): Run {
  return s.phase === "playing" || s.phase === "sailing"
    ? { ...s, resumePhase: s.phase, phase: "paused" }
    : s;
}
export function resumeRush(s: Run): Run {
  return s.phase === "paused" ? { ...s, phase: s.resumePhase } : s;
}
export function loadLane(s: Run, lane: number): Run {
  if (s.phase !== "playing" || !s.current || ![0, 1, 2].includes(lane))
    return s;
  if (lane !== s.current.lane)
    return {
      ...s,
      combo: 0,
      wrong: lane,
      feedback: "Match the symbol on the car.",
      flash: 0.65,
    };
  const loaded = [...s.loaded, s.current],
    score = s.score + 100 + Math.min(s.combo, 5) * 20;
  return {
    ...s,
    loaded,
    score,
    combo: s.combo + 1,
    current: null,
    delay: 0.3,
    wrong: null,
    flash: 0.6,
    feedback:
      loaded.length >= TARGET
        ? "All aboard! Next stop: Newfoundland."
        : `Aboard! ${loaded.length} of ${TARGET}.`,
    phase: loaded.length >= TARGET ? "sailing" : "playing",
  };
}
export function tickRush(s: Run, seconds: number): Run {
  if (
    !["playing", "sailing"].includes(s.phase) ||
    !Number.isFinite(seconds) ||
    seconds <= 0
  )
    return s;
  const dt = Math.min(seconds, 0.1);
  if (s.phase === "sailing") {
    const sailing = Math.min(3, s.sailing + dt);
    return { ...s, sailing, phase: sailing >= 3 ? "arrived" : "sailing" };
  }
  let n = {
    ...s,
    elapsed: Math.min(ROUND_SECONDS, s.elapsed + dt),
    flash: Math.max(0, s.flash - dt),
    delay: Math.max(0, s.delay - dt),
  };
  if (n.elapsed >= ROUND_SECONDS)
    return {
      ...n,
      phase: "ended",
      current: null,
      feedback: "Departure time! Try for a full deck next run.",
    };
  if (s.current) {
    const remaining = s.current.remaining - dt;
    n = { ...n, current: { ...s.current, remaining } };
    if (remaining <= 0)
      n = {
        ...n,
        current: null,
        missed: n.missed + 1,
        combo: 0,
        delay: 0.35,
        feedback: "That car will catch the next one. Keep loading!",
        flash: 0.7,
      };
  } else if (n.delay <= 0) n = nextCar(n);
  return n;
}
