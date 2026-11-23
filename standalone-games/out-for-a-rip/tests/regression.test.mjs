import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const original = readFileSync(new URL('../game.js', import.meta.url), 'utf8');
function harness(stored = { sound: false }) {
  const nodes = new Map(), listeners = new Map();
  function node(id = '') {
    if (nodes.has(id)) return nodes.get(id);
    const classes = new Set();
    const el = {
      id, textContent: '', innerHTML: '', style: {}, children: [], dataset: {},
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle(x, on) { if (on ?? !classes.has(x)) classes.add(x); else classes.delete(x); } },
      listeners: new Map(), addEventListener(name, fn) { this.listeners.set(name, fn); },
      setAttribute() {}, focus() {}, setPointerCapture() {}, remove() {},
      appendChild(child) { this.children.push(child); }, querySelector() { return this.children[0] || null; },
      getBoundingClientRect() { return { left: 0, top: 0, width: 126, height: 126 }; },
      getContext() { return { setTransform() {} }; },
    };
    nodes.set(id, el); return el;
  }
  const document = {
    getElementById: node, createElement: () => node(`created-${nodes.size}`),
    querySelectorAll(selector) { return selector === '.screen' ? ['menu', 'upgradeScreen', 'shedScreen', 'pauseScreen', 'gameOverScreen', 'helpScreen'].map(node) : []; },
    addEventListener(name, fn) { listeners.set(`document:${name}`, fn); }, hidden: false,
  };
  const context = vm.createContext({
    console, document, navigator: { maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }),
    innerWidth: 900, innerHeight: 700, devicePixelRatio: 1,
    performance: { now: () => 1000 }, requestAnimationFrame() {}, setTimeout() {},
    localStorage: { getItem: () => JSON.stringify(stored), setItem() {} },
    addEventListener(name, fn) { listeners.set(name, fn); },
  });
  context.window = context;
  const source = original.replace(/\}\)\(\);\s*$/, `globalThis.audit = {
    startGame, update, completeDelivery, setMode, formatTime, angleLerp, collideHazard, spawnCollectible,
    setRandom(value) { Math.random=()=>value; },
    get entities() {return entities;},
    get state() { return {run, player, mode, keys, mobileAxis, mobileBoost, save, lastHudUpdate}; },
    setEntities(value) { entities = value; },
    upgradeSuspension() { RUN_UPGRADES.find(u=>u.id==='suspension').apply(player); }
  };})();`);
  vm.runInContext(source, context);
  return { api: context.audit, nodes, listeners, document };
}

test('replay resets the HUD update clock and updates the new run immediately', () => {
  const { api, nodes } = harness();
  api.startGame();
  for (let i = 0; i < 80; i++) api.update(.05);
  assert.ok(api.state.lastHudUpdate > 3);
  api.startGame();
  assert.equal(api.state.lastHudUpdate, 0);
  api.state.run.score = 123;
  api.update(.05); api.update(.05);
  assert.equal(nodes.get('hudScore').textContent, '123');
});

test('opening help and losing focus pause the run and release all held controls', () => {
  const { api, nodes, listeners } = harness();
  api.startGame();
  listeners.get('keydown')({ code: 'KeyD', target: {}, preventDefault() {} });
  assert.equal(api.state.keys.KeyD, true);
  nodes.get('helpBtn').onclick();
  const time = api.state.run.time;
  assert.equal(api.state.mode, 'pause');
  assert.equal(api.state.keys.KeyD, undefined);
  api.update(.05);
  assert.equal(api.state.run.time, time);
  api.setMode('game');
  listeners.get('keydown')({ code: 'Space', target: {}, preventDefault() {} });
  listeners.get('blur')();
  assert.equal(api.state.mode, 'pause');
  assert.equal(api.state.keys.Space, undefined);
});

test('upgrade reward waits through a pause and cannot leak into a replay', () => {
  const { api } = harness();
  api.startGame(); api.completeDelivery(); api.completeDelivery();
  assert.equal(api.state.run.upgradeIn, .5);
  api.setMode('pause'); api.update(2);
  assert.equal(api.state.run.upgradeIn, .5);
  api.setMode('game');
  for (let i = 0; i < 11; i++) api.update(.05);
  assert.equal(api.state.mode, 'upgrade');
  api.startGame();
  assert.equal(api.state.run.upgradeIn, null);
});

test('malformed saves are repaired and a missing audio API does not block starting', () => {
  const { api } = harness({ sound: true, coins: -100, bestScore: 'bad', home: '__proto__', upgrades: null, achievements: null });
  assert.equal(api.state.save.coins, 0);
  assert.equal(api.state.save.home, 'NS');
  api.startGame();
  assert.equal(api.state.mode, 'game');
  assert.equal(api.state.player.health, 100);
  assert.equal(api.state.save.sound, false);
});

test('suspension cannot make pothole collisions heal the car', () => {
  const { api } = harness(); api.startGame();
  for (let i = 0; i < 20; i++) api.upgradeSuspension();
  const before = api.state.player.health;
  api.collideHazard({ type: 'pothole' });
  assert.ok(api.state.player.health < before);
  assert.equal(api.state.player.potholeResist, .85);
});

test('timer rounds consistently at minute boundaries and steering takes the shortest turn', () => {
  const { api } = harness();
  assert.equal(api.formatTime(59.9), '1:00');
  assert.equal(api.formatTime(60.1), '1:01');
  assert.equal(api.formatTime(-.1), '0:00');
  const delta = api.angleLerp(3.1, -3.1, .5) - 3.1;
  assert.ok(delta > 0 && delta < .1);
});

test('a gull exactly on the player does not get NaN coordinates', () => {
  const { api } = harness(); api.startGame();
  const gull = { type: 'gull', x: api.state.player.x, y: api.state.player.y, vx: 0, vy: 0, phase: 0, scared: 0, r: 17, hitCd: 0 };
  api.setEntities([gull]); api.update(.01);
  assert.ok(Number.isFinite(gull.x) && Number.isFinite(gull.y));
});


test('extra bottle-refund luck never eliminates coffee, repairs or time pickups', () => {
  const { api } = harness(); api.startGame(); api.state.player.coinLuck=10;
  for (const [roll,type] of [[.75,'coffee'],[.85,'note'],[.92,'tape'],[.99,'clock']]) {
    api.setEntities([]); api.setRandom(roll); api.spawnCollectible();
    assert.equal(api.entities[0].type,type);
  }
});
