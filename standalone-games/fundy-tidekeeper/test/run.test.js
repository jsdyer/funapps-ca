import test from "node:test";
import assert from "node:assert/strict";
import {
  createRun,
  startRun,
  pauseRun,
  resumeRun,
  stepRun,
  tideAt,
  TARGET,
} from "../web/run-engine.js";
test("ready and paused modes do not spend time", () => {
  const ready = createRun();
  assert.equal(stepRun(ready, 1), ready);
  const paused = pauseRun(startRun());
  assert.equal(stepRun(paused, 1), paused);
  assert.equal(resumeRun(paused).phase, "playing");
});
test("movement is bounded and resumed time jumps are clamped", () => {
  let s = startRun();
  s = stepRun(s, 100, { axis: 1 });
  assert.equal(s.elapsed, 0.1);
  for (let i = 0; i < 100; i++) s = stepRun(s, 0.1, { axis: 1 });
  assert.equal(s.x, 90);
  for (let i = 0; i < 100; i++) s = stepRun(s, 0.1, { target: -100 });
  assert.equal(s.x, 10);
});
test("crate contact awards points once and a completed haul wins", () => {
  let s = {
    ...startRun(),
    caught: TARGET - 1,
    items: [{ id: 1, x: 50, y: 73, kind: "crate" }],
  };
  s = stepRun(s, 0.1);
  assert.equal(s.phase, "won");
  assert.equal(s.caught, TARGET);
  assert.equal(s.score, 100);
  assert.equal(s.items.length, 0);
  assert.equal(stepRun(s, 0.1), s);
});
test("rocks collide only while exposed, do not kill a run, and reset combos", () => {
  let s = {
    ...startRun(),
    elapsed: 18,
    combo: 4,
    score: 200,
    items: [{ id: 1, x: 50, y: 74, kind: "rock" }],
  };
  s = stepRun(s, 0.1);
  assert.equal(s.bumps, 1);
  assert.equal(s.score, 160);
  assert.equal(s.combo, 0);
  assert.equal(s.phase, "playing");
  s = {
    ...startRun(),
    elapsed: 6,
    items: [{ id: 1, x: 50, y: 74, kind: "rock" }],
  };
  assert.equal(stepRun(s, 0.1).bumps, 0);
});
test("timeout, restart and corrupt dt are safe", () => {
  let s = { ...startRun(), elapsed: 59.95 };
  s = stepRun(s, 0.1);
  assert.equal(s.phase, "ended");
  assert.equal(startRun().elapsed, 0);
  assert.equal(startRun().score, 0);
  assert.equal(stepRun(s, NaN), s);
  assert.ok(tideAt(6) > tideAt(18));
});
test("autosteering the nearest incoming crate can finish a real generated run", () => {
  let s = startRun();
  for (let i = 0; i < 6000 && s.phase === "playing"; i++) {
    const target = s.items
      .filter((v) => v.kind === "crate" && v.y < 87)
      .sort((a, b) => b.y - a.y)[0]?.x;
    s = stepRun(s, 0.02, { target });
  }
  assert.equal(s.phase, "won");
  assert.equal(s.caught, TARGET);
});
