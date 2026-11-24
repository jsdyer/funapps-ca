export const ROUND_SECONDS = 60,
  TARGET = 10;
export function createRun() {
  return {
    phase: "ready",
    elapsed: 0,
    x: 50,
    items: [],
    spawn: 0,
    serial: 0,
    score: 0,
    caught: 0,
    bumps: 0,
    combo: 0,
    flash: 0,
    notice: "Catch the golden crates. Mind the rocks.",
  };
}
export function startRun() {
  return { ...createRun(), phase: "playing", spawn: 0.15 };
}
export function pauseRun(s) {
  return s.phase === "playing" ? { ...s, phase: "paused" } : s;
}
export function resumeRun(s) {
  return s.phase === "paused" ? { ...s, phase: "playing" } : s;
}
export function tideAt(t) {
  return (1 + Math.sin((t * Math.PI) / 12)) / 2;
}
export function stepRun(state, seconds, input = {}) {
  if (state.phase !== "playing" || !Number.isFinite(seconds) || seconds <= 0)
    return state;
  const dt = Math.min(seconds, 0.1),
    s = { ...state, items: state.items.map((x) => ({ ...x })) };
  s.elapsed = Math.min(ROUND_SECONDS, s.elapsed + dt);
  s.flash = Math.max(0, s.flash - dt);
  if (Number.isFinite(input.target))
    s.x += Math.max(-90 * dt, Math.min(90 * dt, input.target - s.x));
  else s.x += Math.max(-1, Math.min(1, input.axis || 0)) * 64 * dt;
  s.x = Math.max(10, Math.min(90, s.x));
  s.spawn -= dt;
  if (s.spawn <= 0) {
    const sequence = [50, 30, 70, 50, 20, 80, 40, 60, 25, 75],
      n = s.serial++;
    s.items.push({
      id: n,
      x: sequence[n % sequence.length],
      y: -7,
      kind: n % 4 === 3 ? "rock" : "crate",
      hit: false,
    });
    s.spawn = 1.35;
  }
  const low = tideAt(s.elapsed) < 0.48;
  for (const item of s.items) {
    const oldY = item.y;
    item.y += (item.kind === "crate" ? 27 : 25) * dt;
    if (!item.hit && oldY < 87 && item.y >= 74 && Math.abs(item.x - s.x) < 9) {
      if (item.kind === "crate") {
        item.hit = true;
        s.caught++;
        s.combo++;
        s.score += 100 + Math.min(5, s.combo - 1) * 20;
        s.notice = "+1 crate aboard!";
        s.flash = 0.65;
      } else if (low) {
        item.hit = true;
        s.bumps++;
        s.combo = 0;
        s.score = Math.max(0, s.score - 40);
        s.notice = "A little bump. Keep going!";
        s.flash = 0.65;
      }
    }
  }
  s.items = s.items.filter((x) => x.y < 112 && !x.hit);
  if (s.caught >= TARGET) {
    s.phase = "won";
    s.notice = "All ten crates are home!";
  } else if (s.elapsed >= ROUND_SECONDS) {
    s.phase = "ended";
    s.notice = "Back to the harbour. Another run?";
  }
  return s;
}
