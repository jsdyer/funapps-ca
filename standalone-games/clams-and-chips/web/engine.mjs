/** Clams & Chips simulation: breaded, deep-fried clam meat and fried potato chips. */
export const GAME_CONFIG = Object.freeze({
  duration: 90,
  maxFrameSeconds: 0.1,
  orderPatience: 22,
  minOrderPatience: 16,
  patienceDropPerOrder: 0.25,
  baseOrderPoints: 100,
  speedBonusPoints: 50,
  maxMultiplier: 3,
  fryers: Object.freeze({
    clams: Object.freeze({ cookSeconds: 4, readySeconds: 2.4, batchSize: 3 }),
    chips: Object.freeze({ cookSeconds: 5, readySeconds: 2.5, batchSize: 3 }),
  }),
});

const TYPES = ['clams', 'chips'];
const internals = new WeakMap();
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function settings(state) {
  const value = internals.get(state);
  if (!value) throw new TypeError('Use createGame() to create the game state.');
  return value;
}

function positive(value, label, maximum = 600) {
  if (!Number.isFinite(value) || value <= 0 || value > maximum) {
    throw new RangeError(`${label} must be greater than zero and no more than ${maximum}.`);
  }
  return value;
}

function configuration(overrides, duration) {
  const config = { ...GAME_CONFIG, ...overrides, duration: overrides.duration ?? duration };
  config.duration = positive(config.duration, 'duration');
  config.maxFrameSeconds = positive(config.maxFrameSeconds, 'maxFrameSeconds', 0.1);
  config.orderPatience = positive(config.orderPatience, 'orderPatience');
  config.minOrderPatience = positive(config.minOrderPatience, 'minOrderPatience');
  if (config.minOrderPatience > config.orderPatience) throw new RangeError('minOrderPatience cannot exceed orderPatience.');
  if (!Number.isFinite(config.patienceDropPerOrder) || config.patienceDropPerOrder < 0 || config.patienceDropPerOrder > 10) throw new RangeError('Invalid patienceDropPerOrder.');
  for (const key of ['baseOrderPoints', 'speedBonusPoints', 'maxMultiplier']) {
    if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > 10000) throw new RangeError(`Invalid ${key}.`);
  }
  config.fryers = {};
  for (const type of TYPES) {
    const fryer = { ...GAME_CONFIG.fryers[type], ...overrides.fryers?.[type] };
    positive(fryer.cookSeconds, `${type}.cookSeconds`, 60);
    positive(fryer.readySeconds, `${type}.readySeconds`, 30);
    if (!Number.isInteger(fryer.batchSize) || fryer.batchSize < 1 || fryer.batchSize > 20) throw new RangeError(`Invalid ${type}.batchSize.`);
    config.fryers[type] = Object.freeze(fryer);
  }
  return Object.freeze({ ...config, fryers: Object.freeze(config.fryers) });
}

function randomUnit(internal) {
  const value = Number(internal.random());
  return Number.isFinite(value) ? clamp(value, 0, 0.99999999) : 0.5;
}

function nextOrder(state, internal) {
  const id = internal.nextOrder++;
  const c = internal.config;
  const patience = Math.max(c.minOrderPatience, c.orderPatience - state.served * c.patienceDropPerOrder);
  // The first two tickets are straightforward. Every ticket always includes both foods.
  state.order = {
    id,
    clams: id <= 2 ? 1 : randomUnit(internal) < 0.35 ? 2 : 1,
    chips: id <= 2 ? 1 : randomUnit(internal) < 0.35 ? 2 : 1,
    timeLeft: patience,
    patience,
  };
}

function reset(state, internal, status) {
  Object.assign(state, {
    status,
    timeLeft: internal.config.duration,
    score: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    missed: 0,
    burned: 0,
    stock: { clams: 0, chips: 0 },
    fryers: { clams: { phase: 'empty', elapsed: 0 }, chips: { phase: 'empty', elapsed: 0 } },
    order: null,
    events: [],
  });
  internal.nextOrder = 1;
  nextOrder(state, internal);
}

export function createGame({ random = Math.random, duration = GAME_CONFIG.duration, config = {} } = {}) {
  if (typeof random !== 'function') throw new TypeError('random must be a function.');
  const internal = { random, config: configuration(config, duration), nextOrder: 1 };
  const state = {};
  internals.set(state, internal);
  reset(state, internal, 'ready');
  return state;
}

export function startGame(state) {
  reset(state, settings(state), 'playing');
  return state;
}

export function pauseGame(state) {
  settings(state);
  if (state.status === 'playing') state.status = 'paused';
  state.events = [];
  return state;
}

export function resumeGame(state) {
  settings(state);
  if (state.status === 'paused') state.status = 'playing';
  state.events = [];
  return state;
}

function finish(state) {
  if (state.status === 'over') return;
  state.status = 'over';
  state.timeLeft = 0;
  state.events.push({ type: 'end', points: state.score, served: state.served });
}

/** Consume state.events immediately; each action/tick replaces the previous event list. */
export function action(state, type) {
  const internal = settings(state);
  state.events = [];
  if (state.status !== 'playing') return state;
  if (type === 'serve') {
    const order = state.order;
    const needed = {
      clams: Math.max(0, order.clams - state.stock.clams),
      chips: Math.max(0, order.chips - state.stock.chips),
    };
    if (needed.clams || needed.chips) {
      state.events.push({ type: 'short', needed });
      return state;
    }
    state.stock.clams -= order.clams;
    state.stock.chips -= order.chips;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const multiplier = Math.min(internal.config.maxMultiplier, state.combo);
    const speedBonus = Math.round(internal.config.speedBonusPoints * clamp(order.timeLeft / order.patience, 0, 1));
    const points = internal.config.baseOrderPoints * multiplier + speedBonus;
    state.score += points;
    state.events.push({ type: 'serve', points, speedBonus, multiplier, order: order.id });
    nextOrder(state, internal);
    return state;
  }
  if (!TYPES.includes(type)) return state;
  const fryer = state.fryers[type];
  if (fryer.phase === 'empty') {
    fryer.phase = 'cooking';
    fryer.elapsed = 0;
    state.events.push({ type: 'load', food: type });
  } else if (fryer.phase === 'cooking') {
    fryer.phase = 'empty';
    fryer.elapsed = 0;
    state.events.push({ type: 'early', food: type });
  } else if (fryer.phase === 'ready') {
    const portions = internal.config.fryers[type].batchSize;
    state.stock[type] += portions;
    fryer.phase = 'empty';
    fryer.elapsed = 0;
    state.events.push({ type: 'lift', food: type, portions });
  } else if (fryer.phase === 'burnt') {
    fryer.phase = 'empty';
    fryer.elapsed = 0;
    state.events.push({ type: 'clear', food: type });
  }
  return state;
}

/** Advance an animation frame. Long inactive gaps cannot jump or skip a shift. */
export function tick(state, dt) {
  const internal = settings(state);
  state.events = [];
  if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return state;
  const step = Math.min(dt, internal.config.maxFrameSeconds, state.timeLeft);
  state.timeLeft = Math.max(0, state.timeLeft - step);
  if (state.timeLeft <= 1e-9) { finish(state); return state; }
  for (const food of TYPES) {
    const fryer = state.fryers[food], c = internal.config.fryers[food];
    if (!['cooking', 'ready'].includes(fryer.phase)) continue;
    fryer.elapsed = Math.min(c.cookSeconds + c.readySeconds, fryer.elapsed + step);
    if (fryer.phase === 'cooking' && fryer.elapsed >= c.cookSeconds - 1e-9) {
      fryer.phase = 'ready';
      state.events.push({ type: 'ready', food });
    }
    if (fryer.phase === 'ready' && fryer.elapsed >= c.cookSeconds + c.readySeconds - 1e-9) {
      fryer.phase = 'burnt';
      state.burned += 1;
      state.events.push({ type: 'burn', food });
    }
  }
  state.order.timeLeft = Math.max(0, state.order.timeLeft - step);
  if (state.order.timeLeft <= 1e-9) {
    const id = state.order.id;
    state.missed += 1;
    state.combo = 0;
    state.events.push({ type: 'miss', order: id });
    nextOrder(state, internal);
  }
  return state;
}
