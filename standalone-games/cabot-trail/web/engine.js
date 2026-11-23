export const LENGTH = 10400;
export const MAX_SPEED = 72;
export const STOPS = [
  { id: 'ingonish', name: 'Ingonish', subtitle: 'The Atlantic side', z: 1750, colour: '#e1a65d', note: 'A beach, a blue horizon, and the highlands behind you.' },
  { id: 'neils', name: 'Neils Harbour', subtitle: 'A harbour interlude', z: 4100, colour: '#d77f61', note: 'Little roofs gather around a quiet stretch of water.' },
  { id: 'pleasant', name: 'Pleasant Bay', subtitle: 'The coast opens up', z: 6500, colour: '#688f85', note: 'Pause for the sea before the next climb into the hills.' },
  { id: 'cheticamp', name: 'Chéticamp', subtitle: 'The western shore', z: 8750, colour: '#b597b3', note: 'One last coastal postcard before the road brings you home.' },
];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function curveAt(z) {
  const start = clamp((z - 400) / 600, 0, 1);
  // Wide, straight approaches make the four photo stops forgiving.
  const approach = Math.min(...STOPS.map(stop => Math.abs(stop.z - z)));
  const gentle = .18 + .82 * clamp((approach - 400) / 300, 0, 1);
  return (Math.sin(z / 610) * .62 + Math.sin(z / 230) * .25) * start * gentle;
}
export function hillAt(z) { return Math.sin(z / 780) * 38 + Math.sin(z / 320) * 10; }
export function createGame() {
  return { status: 'intro', z: 0, x: .32, speed: 0, comfort: 100, daylight: 330, photos: [], elapsed: 0, offroad: 0, checkpoint: 0, recovery: false };
}
export function nextStop(state) { return STOPS.find(s => !state.photos.includes(s.id) && s.z + 260 >= state.z); }
export function nearbyStop(state) { return STOPS.find(s => !state.photos.includes(s.id) && Math.abs(s.z - state.z) < 260); }
export function canPhotograph(state) { return state.status === 'driving' && !!nearbyStop(state) && state.speed <= 22 && state.x >= .38 && state.x <= 1.22; }
export function takePhoto(state) {
  if (!canPhotograph(state)) return null;
  const stop = nearbyStop(state);
  state.photos.push(stop.id); state.status = 'photo'; state.speed = 0;
  state.comfort = Math.min(100, state.comfort + 12);
  state.checkpoint = stop.z + 270;
  return stop;
}
export function continueTour(state) {
  state.z = Math.max(state.z, state.checkpoint); state.x = .32; state.speed = 0; state.status = 'driving';
}
export function recover(state) {
  state.z = state.checkpoint; state.x = .32; state.speed = 0; state.comfort = 100; state.daylight = 330; state.recovery = true; state.status = 'driving';
}
export function score(state) { return Math.round(state.photos.length * 1000 + state.comfort * 10 + Math.max(0, state.daylight) * 2); }
export function step(state, input, dt) {
  if (state.status !== 'driving') return;
  dt = clamp(dt, 0, .05);
  state.elapsed += dt; state.daylight -= dt;
  const brake = input.brake;
  const target = input.accelerate ? MAX_SPEED : 46;
  if (brake) state.speed = Math.max(0, state.speed - 46 * dt);
  else state.speed += clamp(target - state.speed, -16 * dt, 19 * dt);
  const steering = Number(!!input.right) - Number(!!input.left);
  const steerRate = .64 + .65 * (state.speed / MAX_SPEED);
  if (state.speed > .2) state.x += steering * steerRate * dt;
  state.x -= curveAt(state.z) * (state.speed / MAX_SPEED) ** 2 * .75 * dt;
  state.x = clamp(state.x, -1.65, 1.65);
  if (Math.abs(state.x) > 1.02) {
    state.comfort -= 11 * dt; state.offroad += dt;
    state.speed = Math.max(8, state.speed - 24 * dt);
  } else if (Math.abs(state.x) < .88 && state.speed < 56) {
    state.comfort = Math.min(100, state.comfort + .35 * dt);
  }
  state.z = Math.min(LENGTH, state.z + state.speed * dt);
  if (state.comfort <= 0 || state.daylight <= 0) { state.comfort = Math.max(0, state.comfort); state.status = 'lost'; }
  else if (state.z >= LENGTH) state.status = 'won';
}
