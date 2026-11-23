/** Donair Dash simulation. No DOM, timers, storage, or network dependencies. */
export const INGREDIENTS = Object.freeze({
  beef: Object.freeze({ label: 'Donair beef', short: 'Beef', color: '#a65f43', junk: false }),
  tomato: Object.freeze({ label: 'Tomato', short: 'Tomato', color: '#ff665a', junk: false }),
  onion: Object.freeze({ label: 'Onion', short: 'Onion', color: '#d9a5ff', junk: false }),
  sauce: Object.freeze({ label: 'Donair sauce', short: 'Sauce', color: '#fff6d5', junk: false }),
  lettuce: Object.freeze({ label: 'Lettuce', short: 'Lettuce', color: '#a4dc70', junk: true }),
  chips: Object.freeze({ label: 'Fries', short: 'Fries', color: '#ffd05c', junk: true }),
});

export const CATCH_Y = 0.84;
export const CATCH_HALF_WIDTH = 0.075;
export const PLAYER_MIN_X = 0.08;
export const PLAYER_MAX_X = 0.92;
const MAX_FRAME_SECONDS = 0.1;
const internals = new WeakMap();
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function settings(state) {
  const value = internals.get(state);
  if (!value) throw new TypeError('Use createGame() to create the game state.');
  return value;
}

function randomUnit(config) {
  const value = Number(config.random());
  return Number.isFinite(value) ? clamp(value, 0, 0.999999999) : 0.5;
}

function recipe(config) {
  return randomUnit(config) < 0.5
    ? ['beef', 'tomato', 'onion', 'sauce']
    : ['beef', 'onion', 'tomato', 'sauce'];
}

function resetRound(state, config, status) {
  Object.assign(state, {
    status,
    timeLeft: config.duration,
    score: 0,
    orders: 0,
    combo: 0,
    bestCombo: 0,
    recipe: recipe(config),
    recipeIndex: 0,
    stack: [],
    items: [],
    playerX: 0.5,
    elapsed: 0,
    events: [],
  });
  config.spawnIn = 0.25;
  config.nextId = 1;
  config.offTargetSpawns = 0;
}

export function createGame({ random = Math.random, duration = 60 } = {}) {
  if (typeof random !== 'function') throw new TypeError('random must be a function.');
  if (!Number.isFinite(duration) || duration <= 0 || duration > 600) {
    throw new RangeError('duration must be between 0 and 600 seconds.');
  }
  const state = {};
  const config = { random, duration };
  internals.set(state, config);
  resetRound(state, config, 'ready');
  return state;
}

export function startGame(state) {
  resetRound(state, settings(state), 'playing');
  return state;
}

export function setPlayer(state, x) {
  settings(state);
  if (Number.isFinite(x)) state.playerX = clamp(x, PLAYER_MIN_X, PLAYER_MAX_X);
  return state.playerX;
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
  state.timeLeft = 0;
  state.status = 'over';
  state.events.push({ type: 'end', points: state.score });
}

function catchIngredient(state, item, config) {
  if (item.type !== state.recipe[state.recipeIndex]) {
    state.combo = 0;
    state.timeLeft = Math.max(0, state.timeLeft - 2);
    state.events.push({ type: 'wrong', ingredient: item.type, points: 0 });
    if (state.timeLeft <= 0) finish(state);
    return;
  }

  state.stack.push(item.type);
  state.recipeIndex += 1;
  state.score += 25;
  state.events.push({ type: 'catch', ingredient: item.type, points: 25 });
  // New targets should arrive promptly after the recipe advances.
  config.offTargetSpawns = 2;
  config.spawnIn = Math.min(config.spawnIn, 0.3);

  if (state.recipeIndex === state.recipe.length) {
    state.orders += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const multiplier = Math.min(3, state.combo);
    const points = 150 * multiplier;
    state.score += points;
    state.events.push({ type: 'serve', points, multiplier, order: state.orders });
    state.recipe = recipe(config);
    state.recipeIndex = 0;
    state.stack = [];
  }
}

function spawn(state, config) {
  const next = state.recipe[state.recipeIndex];
  const roll = randomUnit(config);
  let type;
  // Never make the player wait through more than two off-target drops.
  if (roll < 0.68 || config.offTargetSpawns >= 2) {
    type = next;
    config.offTargetSpawns = 0;
  } else if (roll < 0.85) {
    const other = state.recipe.filter(value => value !== next);
    type = other[Math.floor(randomUnit(config) * other.length)];
    config.offTargetSpawns += 1;
  } else {
    type = randomUnit(config) < 0.5 ? 'lettuce' : 'chips';
    config.offTargetSpawns += 1;
  }
  const speed = 0.22 + Math.min(0.12, state.orders * 0.012 + state.elapsed * 0.0008);
  state.items.push({
    id: config.nextId++,
    type,
    x: 0.12 + randomUnit(config) * 0.76,
    y: -0.08,
    speed,
    spin: (randomUnit(config) - 0.5) * 0.8,
  });
  config.spawnIn = Math.max(0.52, 0.82 - state.orders * 0.025);
}

/** Advance one animation frame; ignored gaps above 100ms do not jump the round. */
export function tick(state, dt) {
  const config = settings(state);
  state.events = [];
  if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return state;
  const step = Math.min(dt, MAX_FRAME_SECONDS, state.timeLeft);
  if (step <= 0) { finish(state); return state; }

  state.elapsed += step;
  state.timeLeft = Math.max(0, state.timeLeft - step);
  // Once the bell rings, items crossing on a later frame cannot earn points.
  if (state.timeLeft <= 1e-9) { finish(state); return state; }

  const remaining = [];
  for (const item of state.items) {
    const before = item.y;
    item.y += item.speed * step;
    const crossesPita = before < CATCH_Y && item.y >= CATCH_Y;
    if (state.status === 'playing' && crossesPita && Math.abs(item.x - state.playerX) <= CATCH_HALF_WIDTH) {
      catchIngredient(state, item, config);
    } else if (item.y <= 1.12) {
      remaining.push(item);
    }
  }
  state.items = remaining;
  if (state.status !== 'playing') return state;

  config.spawnIn -= step;
  if (config.spawnIn <= 0) spawn(state, config);
  return state;
}
