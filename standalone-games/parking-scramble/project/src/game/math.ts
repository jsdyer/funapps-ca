export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function wrap(a: number) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** yaw 0 faces +Y (north). +yaw turns toward -X, which is left on screen. */
export function forward(yaw: number) {
  return { x: -Math.sin(yaw), y: Math.cos(yaw) };
}

export function right(yaw: number) {
  const f = forward(yaw);
  return { x: f.y, y: -f.x };
}

export function angNorm(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
