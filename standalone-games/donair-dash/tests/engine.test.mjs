import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, startGame, tick, setPlayer, pauseGame, resumeGame,
  CATCH_Y, CATCH_HALF_WIDTH, INGREDIENTS,
} from '../engine.mjs';

function playing(options = {}) {
  return startGame(createGame({ random: () => 0.25, ...options }));
}

function catchNext(state, type = state.recipe[state.recipeIndex], x = state.playerX) {
  state.items = [{ id: 'test', type, x, y: CATCH_Y - 0.005, speed: 0.25, spin: 0 }];
  tick(state, 0.04);
}

function serve(state) {
  for (let i = 0; i < 4; i++) catchNext(state);
}

test('the round starts ready, starts cleanly, and can be replayed without old items or scores', () => {
  const state = createGame();
  tick(state, 0.1);
  assert.equal(state.status, 'ready');
  assert.equal(state.timeLeft, 60);
  startGame(state);
  serve(state);
  assert.equal(state.score, 250);
  assert.equal(startGame(state), state);
  assert.equal(state.score, 0);
  assert.equal(state.orders, 0);
  assert.equal(state.status, 'playing');
  assert.equal(state.timeLeft, 60);
  assert.deepEqual(state.items, []);
  assert.deepEqual(state.stack, []);
  assert.deepEqual(state.events, []);
});

test('catching the ticket in sequence serves an order and caps the streak bonus at 3×', () => {
  const state = playing();
  const totals = [250, 650, 1200, 1750];
  for (const [index, total] of totals.entries()) {
    serve(state);
    assert.equal(state.orders, index + 1);
    assert.equal(state.score, total);
    assert.equal(state.combo, index + 1);
    assert.equal(state.bestCombo, index + 1);
    assert.equal(state.recipeIndex, 0);
    assert.deepEqual(state.stack, []);
    assert.equal(state.events[0].type, 'catch');
    assert.equal(state.events[1].type, 'serve');
    assert.equal(state.events[1].multiplier, Math.min(3, index + 1));
  }
});

test('wrong topping and junk reset the streak, keep the partial order, and cost two seconds', () => {
  for (const type of ['sauce', 'lettuce', 'chips']) {
    const state = playing();
    serve(state);
    catchNext(state); // Beef in the next order.
    const before = state.timeLeft;
    const score = state.score;
    catchNext(state, type);
    assert.equal(state.combo, 0);
    assert.equal(state.bestCombo, 1);
    assert.equal(state.score, score);
    assert.equal(state.recipeIndex, 1);
    assert.deepEqual(state.stack, ['beef']);
    assert.ok(Math.abs(state.timeLeft - (before - 2.04)) < 1e-8);
    assert.deepEqual(state.events, [{ type: 'wrong', ingredient: type, points: 0 }]);
  }
});

test('a penalty at the end finishes once and never creates negative time or later score', () => {
  const state = playing({ duration: 1 });
  catchNext(state, 'lettuce');
  assert.equal(state.status, 'over');
  assert.equal(state.timeLeft, 0);
  assert.deepEqual(state.events.map(event => event.type), ['wrong', 'end']);
  const score = state.score;
  catchNext(state, 'beef');
  assert.equal(state.score, score);
  assert.deepEqual(state.events, []);
});

test('catch collision checks horizontal position and crossing rather than the entire area below the pita', () => {
  const state = playing();
  catchNext(state, 'beef', state.playerX + CATCH_HALF_WIDTH + 0.01);
  assert.equal(state.score, 0);
  setPlayer(state, state.items[0].x);
  tick(state, 0.1);
  assert.equal(state.score, 0, 'an already missed topping cannot be caught after moving under it');
  catchNext(state);
  assert.equal(state.score, 25);
  assert.equal(state.items.length, 0, 'one topping cannot be scored twice');
});

test('pause freezes time, physics, and score; resume continues the same round', () => {
  const state = playing();
  tick(state, 0.1); tick(state, 0.1); tick(state, 0.1);
  const remaining = state.timeLeft;
  const items = JSON.stringify(state.items);
  pauseGame(state);
  for (let i = 0; i < 10; i++) tick(state, 0.1);
  assert.equal(state.timeLeft, remaining);
  assert.equal(JSON.stringify(state.items), items);
  resumeGame(state);
  tick(state, 0.1);
  assert.ok(state.timeLeft < remaining);
  assert.notEqual(JSON.stringify(state.items), items);
});

test('the timer ends at the configured duration and clears per-frame events', () => {
  const state = playing({ duration: 0.3 });
  tick(state, 0.1); tick(state, 0.1); tick(state, 0.1);
  assert.equal(state.timeLeft, 0);
  assert.equal(state.status, 'over');
  assert.equal(state.events.filter(event => event.type === 'end').length, 1);
  tick(state, 0.1);
  assert.deepEqual(state.events, []);
});

test('missed ingredients leave the board without reducing score or time beyond the clock', () => {
  const state = playing();
  state.items = [{ id: 1, type: 'beef', x: 0.12, y: 1.11, speed: 0.3, spin: 0 }];
  tick(state, 0.1);
  assert.deepEqual(state.items, []);
  assert.equal(state.score, 0);
  assert.equal(state.timeLeft, 59.9);
  assert.deepEqual(state.events, []);
});

test('required toppings are guaranteed at least every third spawn even with adverse random draws', () => {
  const state = playing({ random: () => 0.99 });
  setPlayer(state, 0.08); // All generated drops are on the other side.
  const seen = new Map();
  for (let i = 0; i < 130; i++) {
    tick(state, 0.1);
    for (const item of state.items) seen.set(item.id, item.type);
  }
  const types = [...seen.values()];
  assert.ok(types.length >= 12);
  for (let i = 0; i + 2 < types.length; i++) {
    assert.ok(types.slice(i, i + 3).includes('beef'));
  }
  for (const item of state.items) {
    assert.ok(item.x >= 0.12 && item.x <= 0.88);
    assert.ok(INGREDIENTS[item.type]);
  }
});

test('invalid input cannot corrupt the player or skip an entire round', () => {
  const state = playing();
  assert.equal(setPlayer(state, -100), 0.08);
  assert.equal(setPlayer(state, 100), 0.92);
  assert.equal(setPlayer(state, NaN), 0.92);
  for (const dt of [NaN, Infinity, -1, 0]) tick(state, dt);
  assert.equal(state.timeLeft, 60);
  tick(state, 100);
  assert.equal(state.timeLeft, 59.9);
  assert.throws(() => createGame({ duration: 0 }), RangeError);
  assert.throws(() => createGame({ random: 5 }), TypeError);
});
