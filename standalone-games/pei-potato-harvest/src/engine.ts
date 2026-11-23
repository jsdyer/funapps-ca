export type Variety = 'red' | 'gold' | 'russet';
export type Crop = { variety: Variety; age: number; health: number; ripeTurns: number };
export type Field = { name: string; moisture: number; fertility: number; crop: Crop | null };
export type Stock = Record<Variety, { regular: number; premium: number }>;
export type State = { day: number; actions: number; cash: number; water: number; fields: Field[]; stock: Stock; delivered: string[]; harvested: number; premiumHarvested: number; log: string[]; finished: boolean };
export const VARIETIES = {
  red: { name: 'Island reds', short: 'Reds', days: 3, cost: 8, yield: 4, color: '#c45e54', price: 4 },
  gold: { name: 'Golden table', short: 'Golds', days: 4, cost: 10, yield: 5, color: '#d8ad46', price: 5 },
  russet: { name: 'Hearty russets', short: 'Russets', days: 5, cost: 12, yield: 6, color: '#af8461', price: 6 }
} as const;
export const WEATHER = [
  { name: 'Gentle showers', icon: '☂', moisture: 1, note: 'Rain adds 1 moisture to every field.' },
  { name: 'Island sunshine', icon: '☀', moisture: -1, note: 'Sun uses 1 moisture in every field.' },
  { name: 'Dry sea breeze', icon: '≋', moisture: -2, note: 'Dry wind uses 2 moisture. Water before advancing.' },
  { name: 'Passing rain', icon: '☂', moisture: 2, note: 'Rain adds 2 moisture to every field.' },
  { name: 'Soft cloud', icon: '☁', moisture: 0, note: 'No change to field moisture.' },
  { name: 'Dry sea breeze', icon: '≋', moisture: -2, note: 'Dry wind uses 2 moisture. Water before advancing.' },
  { name: 'Passing rain', icon: '☂', moisture: 2, note: 'Rain adds 2 moisture to every field.' },
  { name: 'Island sunshine', icon: '☀', moisture: -1, note: 'Sun uses 1 moisture in every field.' },
  { name: 'Soft cloud', icon: '☁', moisture: 0, note: 'No change to field moisture.' },
  { name: 'Dry sea breeze', icon: '≋', moisture: -2, note: 'Dry wind uses 2 moisture. Water before advancing.' },
  { name: 'Passing rain', icon: '☂', moisture: 2, note: 'Rain adds 2 moisture to every field.' },
  { name: 'Harvest sunset', icon: '☀', moisture: 0, note: 'Last turn. Harvest and deliver before closing the season.' }
] as const;
export const ORDERS = [
  { id: 'market', name: 'Saturday market', caption: 'A bright bag for every basket.', variety: 'red' as Variety, quantity: 4, reward: 34, premiumOnly: false },
  { id: 'supper', name: 'Community supper', caption: 'Golden mash for a full hall.', variety: 'gold' as Variety, quantity: 5, reward: 48, premiumOnly: false },
  { id: 'truck', name: 'The chip truck', caption: 'A proper pile of Island fries.', variety: 'russet' as Variety, quantity: 6, reward: 64, premiumOnly: false },
  { id: 'chef', name: 'Chef’s choice', caption: 'Bonus order · the finest of the crop.', variety: null, quantity: 6, reward: 58, premiumOnly: true }
] as const;
const clamp = (n: number) => Math.max(0, Math.min(4, n));
const clone = (s: State): State => structuredClone(s);
function note(s: State, message: string) { s.log = [message, ...s.log].slice(0, 8); }
function usable(s: State) { return !s.finished && s.actions > 0; }
export function initialState(): State {
  return { day: 1, actions: 4, cash: 44, water: 8,
    fields: ['Seabreeze', 'Redbank', 'Hillside', 'Homestead'].map(name => ({ name, moisture: 2, fertility: 100, crop: null })),
    stock: { red: { regular: 0, premium: 0 }, gold: { regular: 0, premium: 0 }, russet: { regular: 0, premium: 0 } }, delivered: [], harvested: 0, premiumHarvested: 0,
    log: ['Your first season begins. Plant a mix of reds, golds and russets.'], finished: false };
}
export function plant(state: State, index: number, variety: Variety): State {
  if (!usable(state) || !state.fields[index] || state.fields[index].crop || !VARIETIES[variety] || state.cash < VARIETIES[variety].cost || state.day + VARIETIES[variety].days > 12) return state;
  const s = clone(state), f = s.fields[index], v = VARIETIES[variety];
  s.actions--; s.cash -= v.cost; f.crop = { variety, age: 0, health: f.fertility, ripeTurns: 0 };
  note(s, `${v.name} planted in ${f.name}. Ready after ${v.days} growing turns.`); return s;
}
export function waterField(state: State, index: number): State {
  if (!usable(state) || !state.fields[index] || state.fields[index].moisture >= 4 || state.water < 2) return state;
  const s = clone(state); s.actions--; s.water -= 2; s.fields[index].moisture = 4;
  note(s, `${s.fields[index].name} watered to 4. Two barrels used.`); return s;
}
export function refill(state: State): State {
  if (!usable(state) || state.water >= 12) return state;
  const s = clone(state); s.actions--; s.water = Math.min(12, s.water + 6); note(s, 'Rain tank refilled: 6 barrels, up to 12.'); return s;
}
export function compost(state: State, index: number): State {
  if (!usable(state) || !state.fields[index] || state.cash < 5 || state.fields[index].fertility >= 100) return state;
  const s = clone(state), f = s.fields[index]; s.actions--; s.cash -= 5; f.fertility = Math.min(100, f.fertility + 40);
  if (f.crop) f.crop.health = Math.min(100, f.crop.health + 20);
  note(s, `${f.name} composted. Soil recovers; growing crops gain 20 health.`); return s;
}
export function ready(field: Field) { return !!field.crop && field.crop.age >= VARIETIES[field.crop.variety].days; }
export function expectedYield(field: Field) {
  if (!field.crop) return { regular: 0, premium: 0 };
  const c = field.crop, base = VARIETIES[c.variety].yield;
  const total = Math.max(1, base - (c.health < 50 ? 2 : 0));
  const premium = c.health >= 80 ? total : c.health >= 60 ? Math.floor(total / 2) : 0;
  return { regular: total - premium, premium };
}
export function harvest(state: State, index: number): State {
  if (!usable(state) || !state.fields[index] || !ready(state.fields[index])) return state;
  const s = clone(state), f = s.fields[index], c = f.crop!, y = expectedYield(f);
  s.actions--; s.stock[c.variety].regular += y.regular; s.stock[c.variety].premium += y.premium; s.harvested += y.regular + y.premium; s.premiumHarvested += y.premium;
  note(s, `${f.name}: ${y.regular + y.premium} crates harvested, ${y.premium} premium.`);
  f.crop = null; f.fertility = Math.max(30, f.fertility - 35); return s;
}
export function orderAvailable(s: State, id: string): boolean {
  const o = ORDERS.find(o => o.id === id); if (!o || s.delivered.includes(id)) return false;
  return o.variety ? s.stock[o.variety].regular + s.stock[o.variety].premium >= o.quantity : Object.values(s.stock).reduce((sum, x) => sum + x.premium, 0) >= o.quantity;
}
export function deliver(state: State, id: string): State {
  if (!usable(state) || !orderAvailable(state, id)) return state;
  const s = clone(state), o = ORDERS.find(o => o.id === id)!; let remaining = o.quantity, premiumUsed = 0;
  if (o.variety) {
    const stock = s.stock[o.variety], regular = Math.min(remaining, stock.regular); stock.regular -= regular; remaining -= regular;
    stock.premium -= remaining; premiumUsed = remaining;
  } else {
    for (const key of Object.keys(s.stock) as Variety[]) { const used = Math.min(remaining, s.stock[key].premium); s.stock[key].premium -= used; remaining -= used; premiumUsed += used; }
  }
  s.actions--; s.delivered.push(id); const payout = o.reward + (o.premiumOnly ? 0 : premiumUsed * 2); s.cash += payout;
  note(s, `${o.name} delivered for $${payout}. Thank you, farmer!`); return s;
}
export function sellSurplus(state: State, variety: Variety): State {
  if (!usable(state) || !VARIETIES[variety] || state.stock[variety].regular + state.stock[variety].premium === 0) return state;
  const s = clone(state), stock = s.stock[variety], v = VARIETIES[variety], payout = stock.regular * v.price + stock.premium * (v.price + 2);
  s.actions--; s.cash += payout; s.stock[variety] = { regular: 0, premium: 0 }; note(s, `Sold surplus ${v.short.toLowerCase()} at the farm gate for $${payout}.`); return s;
}
export function advance(state: State): State {
  if (state.finished) return state;
  const s = clone(state);
  if (s.day === 12) {
    let payout = 0; for (const key of Object.keys(s.stock) as Variety[]) { const x = s.stock[key]; payout += x.regular * VARIETIES[key].price + x.premium * (VARIETIES[key].price + 2); s.stock[key] = { regular: 0, premium: 0 }; }
    s.cash += payout; s.finished = true; note(s, `Season closed. Remaining crates sold for $${payout}.`); return s;
  }
  const weather = WEATHER[s.day - 1];
  for (const f of s.fields) {
    f.moisture = clamp(f.moisture + weather.moisture);
    if (f.crop) {
      if (ready(f)) { f.crop.ripeTurns++; if (f.crop.ripeTurns >= 2) f.crop.health = Math.max(0, f.crop.health - 15); }
      else { f.crop.age++; if (f.moisture === 0) f.crop.health = Math.max(0, f.crop.health - 20); }
    }
  }
  s.day++; s.actions = 4; s.water = Math.min(12, s.water + Math.max(0, weather.moisture));
  const ripe = s.fields.filter(ready).map(f => f.name);
  note(s, ripe.length ? `Turn ${s.day}. Ready to lift: ${ripe.join(', ')}.` : `Turn ${s.day}. The fields have grown. Check the new forecast.`); return s;
}
export function result(s: State) {
  const core = ['market', 'supper', 'truck'].filter(id => s.delivered.includes(id)).length;
  return { won: core === 3, core, score: s.cash + s.delivered.length * 40 + s.premiumHarvested * 3, title: core === 3 ? (s.delivered.length === 4 ? 'An Island institution' : 'A harvest to be proud of') : core >= 1 ? 'A promising first season' : 'Every farmer starts somewhere' };
}
