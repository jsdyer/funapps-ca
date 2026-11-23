import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, tick, action, pauseGame, resumeGame, GAME_CONFIG } from '../engine.mjs';

function advance(state, seconds) {
  for (let n = 0; n < Math.round(seconds * 100); n++) tick(state, 0.01);
  return state;
}
function playing(options) { return startGame(createGame(options)); }
function cookBoth(state) {
  action(state, 'clams'); action(state, 'chips');
  advance(state, 4); action(state, 'clams');
  advance(state, 1); action(state, 'chips');
}

test('a shift begins ready; starting or replaying clears every old shift value', () => {
  const state = createGame({ random: () => 0.1 });
  assert.equal(state.status, 'ready');
  action(state, 'clams'); assert.equal(state.fryers.clams.phase, 'empty');
  startGame(state); cookBoth(state); action(state, 'serve');
  assert.ok(state.score > 0); assert.equal(state.served, 1);
  startGame(state);
  assert.equal(state.status, 'playing'); assert.equal(state.timeLeft, 90);
  assert.deepEqual(state.stock, { clams: 0, chips: 0 });
  assert.equal(state.fryers.clams.phase, 'empty'); assert.equal(state.fryers.chips.phase, 'empty');
  assert.equal(state.score, 0); assert.equal(state.combo, 0); assert.equal(state.order.id, 1); assert.deepEqual(state.events, []);
});

test('each fryer reaches its own golden window, lifting makes three edible portions', () => {
  const state = playing();
  action(state, 'clams'); action(state, 'chips');
  advance(state, 3.99);
  assert.equal(state.fryers.clams.phase, 'cooking'); assert.equal(state.stock.clams, 0);
  tick(state, 0.01);
  assert.equal(state.fryers.clams.phase, 'ready'); assert.deepEqual(state.events, [{ type: 'ready', food: 'clams' }]);
  assert.equal(state.fryers.chips.phase, 'cooking');
  action(state, 'clams'); assert.equal(state.stock.clams, 3); assert.equal(state.fryers.clams.phase, 'empty');
  advance(state, 1); action(state, 'chips');
  assert.equal(state.stock.chips, 3); assert.equal(state.events[0].type, 'lift');
});

test('an early lift wastes a batch, and a burned basket must be discarded before loading', () => {
  const state = playing();
  action(state, 'clams'); advance(state, 2); action(state, 'clams');
  assert.equal(state.events[0].type, 'early'); assert.equal(state.stock.clams, 0); assert.equal(state.fryers.clams.phase, 'empty');
  action(state, 'chips'); advance(state, 7.5);
  assert.equal(state.fryers.chips.phase, 'burnt'); assert.equal(state.events[0].type, 'burn'); assert.equal(state.burned, 1);
  advance(state, 1); assert.equal(state.burned, 1);
  action(state, 'chips'); assert.equal(state.events[0].type, 'clear'); assert.equal(state.fryers.chips.phase, 'empty'); assert.equal(state.stock.chips, 0);
  action(state, 'chips'); assert.equal(state.fryers.chips.phase, 'cooking');
});

test('only enough lifted food can fulfil a ticket, and no partial stock is consumed on failure', () => {
  const state = playing();
  action(state, 'serve');
  assert.deepEqual(state.events, [{ type: 'short', needed: { clams: 1, chips: 1 } }]);
  action(state, 'clams'); advance(state, 4); action(state, 'clams');
  action(state, 'serve'); assert.deepEqual(state.stock, { clams: 3, chips: 0 }); assert.equal(state.served, 0);
  action(state, 'chips'); advance(state, 5); action(state, 'chips'); action(state, 'serve');
  assert.deepEqual(state.stock, { clams: 2, chips: 2 }); assert.equal(state.served, 1); assert.equal(state.order.id, 2);
  assert.equal(state.events[0].type, 'serve'); assert.ok(state.events[0].speedBonus < 50);
});

test('serving raises the streak multiplier up to three without losing ingredient accounting', () => {
  const state = playing({ random: () => 0.9 });
  state.stock = { clams: 12, chips: 12 };
  const points = [];
  for (let i = 0; i < 5; i++) { action(state, 'serve'); points.push(state.events[0].points); }
  assert.deepEqual(points, [150, 250, 350, 350, 350]);
  assert.equal(state.score, 1450); assert.equal(state.combo, 5); assert.equal(state.bestCombo, 5);
  assert.deepEqual(state.stock, { clams: 7, chips: 7 });
});

test('tickets vary their portion counts and never require another kind of seafood', () => {
  const state = playing({ random: () => 0 });
  state.stock = { clams: 10, chips: 10 };
  action(state, 'serve'); action(state, 'serve');
  assert.equal(state.order.clams, 2); assert.equal(state.order.chips, 2);
  assert.deepEqual(Object.keys(state.stock), ['clams', 'chips']);
  action(state, 'serve'); assert.deepEqual(state.stock, { clams: 6, chips: 6 });
});

test('an impatient customer leaves once, clears the streak, and leaves prepared stock available', () => {
  const state = playing({ config: { orderPatience: 3, minOrderPatience: 3 } });
  state.stock = { clams: 4, chips: 4 };
  action(state, 'serve'); const score = state.score;
  advance(state, 3);
  assert.equal(state.missed, 1); assert.equal(state.combo, 0); assert.equal(state.bestCombo, 1);
  assert.equal(state.order.id, 3); assert.equal(state.score, score); assert.deepEqual(state.stock, { clams: 3, chips: 3 });
  assert.equal(state.events[0].type, 'miss'); assert.ok(state.timeLeft > 0);
});

test('pausing freezes both fryers, customer patience and shift clock; actions cannot run while paused', () => {
  const state = playing(); action(state, 'clams'); advance(state, 2); pauseGame(state);
  const before = JSON.stringify(state); advance(state, 7); action(state, 'clams');
  assert.equal(JSON.stringify(state), before);
  resumeGame(state); advance(state, 2); assert.equal(state.fryers.clams.phase, 'ready');
});

test('the shift bell stops scoring and cooking, emits end once, and never makes negative time', () => {
  const state = playing({ duration: 1 }); state.stock = { clams: 3, chips: 3 };
  action(state, 'clams'); advance(state, 1);
  assert.equal(state.status, 'over'); assert.equal(state.timeLeft, 0); assert.equal(state.events[0].type, 'end');
  const elapsed = state.fryers.clams.elapsed;
  action(state, 'serve'); assert.equal(state.score, 0); assert.deepEqual(state.stock, { clams: 3, chips: 3 });
  tick(state, 10); assert.deepEqual(state.events, []); assert.equal(state.fryers.clams.elapsed, elapsed);
});

test('large frame gaps and invalid delta values cannot skip a shift or corrupt its clocks', () => {
  const state = playing(); const clock = state.timeLeft;
  tick(state, 100); assert.equal(state.timeLeft, clock - GAME_CONFIG.maxFrameSeconds);
  for (const dt of [NaN, Infinity, -1, 0]) tick(state, dt);
  assert.equal(state.timeLeft, clock - GAME_CONFIG.maxFrameSeconds);
  assert.throws(() => createGame({ duration: 0 }), RangeError);
  assert.throws(() => createGame({ config: { fryers: { clams: { batchSize: -1 } } } }), RangeError);
});

test('configuration can expand timing and batch size without changing the engine', () => {
  const state = playing({ config: { duration: 120, fryers: { clams: { cookSeconds: 2, readySeconds: 4, batchSize: 5 } } } });
  action(state, 'clams'); advance(state, 5); assert.equal(state.fryers.clams.phase, 'ready');
  action(state, 'clams'); assert.equal(state.stock.clams, 5); assert.ok(Math.abs(state.timeLeft - 115) < 1e-8);
});
