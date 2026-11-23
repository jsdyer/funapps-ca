import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canSail,
  manifests,
  medal,
  placementError,
  solve,
  usage,
  difference,
} from "./engine.ts";
test("all five manifests have a full valid solution", () => {
  for (const m of manifests) {
    const solution = solve(m);
    assert.ok(solution, m.title);
    assert.equal(Object.keys(solution).length, m.vehicles.length);
    assert.ok(canSail(m, solution));
    assert.ok(difference(m, solution) <= m.tolerance);
    m.capacity.forEach((c, i) => assert.ok(usage(m, solution, i) <= c));
    console.log(m.title, solution);
  }
});
test("partial decks cannot sail and overfilled decks are rejected", () => {
  const m = manifests[0];
  assert.equal(canSail(m, {}), false);
  assert.equal(
    solve(m, Object.fromEntries(m.vehicles.map((v) => [v.id, 0]))),
    null,
  );
  const b = { c: 0, d: 0 };
  assert.match(placementError(m, b, m.vehicles[0], 0)!, /Not enough room/);
});
test("wide lorries require the centre, and cannot be loaded twice", () => {
  const m = manifests[2];
  assert.match(placementError(m, {}, m.vehicles[0], 0)!, /centre/);
  assert.equal(placementError(m, {}, m.vehicles[0], 1), null);
  assert.match(placementError(m, { a: 1 }, m.vehicles[0], 1)!, /already/);
  assert.equal(solve(m, { a: 0 }), null);
});
test("hints preserve existing valid moves and lead all the way to departure", () => {
  for (const m of manifests) {
    let b = {};
    for (const v of m.vehicles) {
      const full = solve(m, b);
      assert.ok(full);
      b = { ...b, [v.id]: full[v.id] };
    }
    assert.ok(canSail(m, b));
  }
});
test("exact balance is required on later crossings, and medals reward efficient play", () => {
  const m = manifests[3];
  const solution = solve(m)!;
  assert.equal(difference(m, solution), 0);
  assert.equal(medal(m, m.vehicles.length, 0), 3);
  assert.equal(medal(m, m.vehicles.length + 2, 1), 2);
  assert.equal(medal(m, 100, 5), 1);
});

test("invalid lane assignments cannot depart", () => {
  const m = manifests[0];
  for (const lane of [-1, 3, 0.5, NaN]) {
    const b = Object.fromEntries(m.vehicles.map((v) => [v.id, lane]));
    assert.equal(canSail(m, b), false);
  }
});

test("a full deck outside the balance tolerance cannot sail", () => {
  assert.equal(canSail(manifests[0], { a: 1, b: 1, c: 0, d: 0, e: 2 }), false);
});
