import test from "node:test";
import assert from "node:assert/strict";
import {
  createRush,
  startRush,
  pauseRush,
  resumeRush,
  loadLane,
  tickRush,
  TARGET,
} from "./rush-engine.ts";
test("ready and pause freeze all clocks; resume restores sailing too", () => {
  const ready = createRush();
  assert.equal(tickRush(ready, 1), ready);
  const paused = pauseRush(startRush());
  assert.equal(tickRush(paused, 1), paused);
  assert.equal(resumeRush(paused).phase, "playing");
  const crossing = pauseRush({ ...startRush(), phase: "sailing" });
  assert.equal(resumeRush(crossing).phase, "sailing");
});
test("wrong lane retains car; correct lane boards exactly once", () => {
  const s = startRush();
  const wrong = loadLane(s, 2);
  assert.equal(wrong.current, s.current);
  assert.equal(wrong.loaded.length, 0);
  const good = loadLane(wrong, 0);
  assert.equal(good.loaded.length, 1);
  assert.equal(good.current, null);
  assert.equal(good.score, 100);
  assert.equal(loadLane(good, 0), good);
  assert.equal(s.loaded.length, 0);
});
test("all twelve cars can be boarded to complete the crossing", () => {
  let s = startRush();
  for (let i = 0; i < TARGET; i++) {
    assert.ok(s.current);
    s = loadLane(s, s.current.lane);
    for (let j = 0; j < 4 && s.phase === "playing"; j++) s = tickRush(s, 0.1);
  }
  assert.equal(s.phase, "sailing");
  assert.equal(s.loaded.length, TARGET);
  for (let j = 0; j < 31; j++) s = tickRush(s, 0.1);
  assert.equal(s.phase, "arrived");
  assert.ok(s.score > 1200);
});
test("missed cars recover; deadline ends safely and restart clears state", () => {
  let s = startRush();
  for (let i = 0; i < 72; i++) s = tickRush(s, 0.1);
  assert.equal(s.missed, 1);
  for (let i = 0; i < 5; i++) s = tickRush(s, 0.1);
  assert.ok(s.current);
  s = tickRush({ ...s, elapsed: 59.99 }, 0.1);
  assert.equal(s.phase, "ended");
  assert.equal(s.current, null);
  assert.equal(startRush().loaded.length, 0);
});
test("frame jumps are clamped and invalid inputs cannot mutate a run", () => {
  const s = startRush();
  assert.equal(tickRush(s, 100).elapsed, 0.1);
  assert.equal(tickRush(s, NaN), s);
  assert.equal(loadLane(s, -1), s);
  assert.equal(loadLane(s, 3), s);
  assert.equal(loadLane(pauseRush(s), 0).loaded.length, 0);
});
test("misses never send a car to a lane that already has four aboard", () => {
  let s = startRush();
  let skipped = 0;
  for (let i = 0; i < 2000 && s.phase === "playing"; i++) {
    if (s.current && s.current.lane === 1 && skipped < 3) {
      s = { ...s, current: { ...s.current, remaining: 0.01 } };
      s = tickRush(s, 0.1);
      skipped++;
    } else if (s.current) {
      assert.ok(s.loaded.filter((c) => c.lane === s.current?.lane).length < 4);
      s = loadLane(s, s.current.lane);
    } else s = tickRush(s, 0.1);
  }
  assert.equal(s.phase, "sailing");
  for (const lane of [0, 1, 2])
    assert.equal(s.loaded.filter((c) => c.lane === lane).length, 4);
});
