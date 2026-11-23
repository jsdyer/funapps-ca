export type Vehicle = {
  id: string;
  name: string;
  kind: "car" | "van" | "truck" | "camper";
  length: number;
  weight: number;
  color: string;
  lanes?: number[];
};
export type Manifest = {
  title: string;
  subtitle: string;
  capacity: number[];
  tolerance: number;
  vehicles: Vehicle[];
};
export type Board = Record<string, number>;
const car = (id: string, name: string, color: string): Vehicle => ({
  id,
  name,
  kind: "car",
  length: 2,
  weight: 1,
  color,
});
const van = (id: string, name: string, color: string): Vehicle => ({
  id,
  name,
  kind: "van",
  length: 3,
  weight: 2,
  color,
});
const camper = (id: string, name: string, color: string): Vehicle => ({
  id,
  name,
  kind: "camper",
  length: 4,
  weight: 2,
  color,
});
const truck = (
  id: string,
  name: string,
  color: string,
  wide = false,
): Vehicle => ({
  id,
  name,
  kind: "truck",
  length: 4,
  weight: 3,
  color,
  ...(wide ? { lanes: [1] } : {}),
});
export const manifests: Manifest[] = [
  {
    title: "The first crossing",
    subtitle: "A small queue. A big island ahead.",
    capacity: [6, 6, 6],
    tolerance: 1,
    vehicles: [
      car("a", "Red hatchback", "#dc7056"),
      car("b", "Blue coupe", "#679bad"),
      van("c", "Bakery van", "#d5ac55"),
      van("d", "Garden van", "#90a780"),
      camper("e", "Weekend camper", "#b88eae"),
    ],
  },
  {
    title: "Off on an adventure",
    subtitle: "Campers take room. Leave a little space.",
    capacity: [8, 8, 8],
    tolerance: 1,
    vehicles: [
      camper("a", "The coast camper", "#d5ac55"),
      camper("b", "Family camper", "#b88eae"),
      van("c", "Surf van", "#679bad"),
      van("d", "Flower delivery", "#90a780"),
      car("e", "Red hatchback", "#dc7056"),
      car("f", "Little cream car", "#d8c39c"),
      car("g", "Teal coupe", "#68a49b"),
    ],
  },
  {
    title: "Freight night",
    subtitle: "The wide lorry can only use the centre lane.",
    capacity: [8, 10, 8],
    tolerance: 1,
    vehicles: [
      truck("a", "Wide grocery lorry", "#d5ac55", true),
      truck("b", "Fish delivery", "#679bad"),
      truck("c", "Building supplies", "#dc7056"),
      van("d", "Mail van", "#90a780"),
      van("e", "The fiddle band", "#b88eae"),
      car("f", "Cream hatchback", "#d8c39c"),
      car("g", "Teal coupe", "#68a49b"),
    ],
  },
  {
    title: "A full summer deck",
    subtitle: "Every square counts on this crossing.",
    capacity: [8, 8, 8],
    tolerance: 0,
    vehicles: [
      truck("a", "Market delivery", "#dc7056"),
      truck("b", "Farm delivery", "#d5ac55"),
      camper("c", "Family camper", "#b88eae"),
      camper("d", "The coast camper", "#679bad"),
      car("e", "Forest hatchback", "#90a780"),
      car("f", "Cream hatchback", "#d8c39c"),
      car("g", "Teal coupe", "#68a49b"),
      car("h", "Rose coupe", "#bb7b85"),
    ],
  },
  {
    title: "One last load",
    subtitle: "A tight fit. An exactly balanced finish.",
    capacity: [9, 10, 9],
    tolerance: 0,
    vehicles: [
      truck("a", "Wide grocery lorry", "#d5ac55", true),
      truck("b", "Fish delivery", "#679bad"),
      truck("c", "Building supplies", "#dc7056"),
      camper("d", "Family camper", "#b88eae"),
      van("e", "Bakery van", "#90a780"),
      van("f", "Mail van", "#68a49b"),
      car("g", "Cream hatchback", "#d8c39c"),
      car("h", "Rose coupe", "#bb7b85"),
      car("i", "Sea-blue hatchback", "#7b91b8"),
    ],
  },
];
export const laneNames = ["Port", "Centre", "Starboard"];
export function usage(m: Manifest, b: Board, lane: number) {
  return m.vehicles
    .filter((v) => b[v.id] === lane)
    .reduce((n, v) => n + v.length, 0);
}
export function weight(m: Manifest, b: Board, lane: number) {
  return m.vehicles
    .filter((v) => b[v.id] === lane)
    .reduce((n, v) => n + v.weight, 0);
}
export function difference(m: Manifest, b: Board) {
  return Math.abs(weight(m, b, 0) - weight(m, b, 2));
}
export function placementError(
  m: Manifest,
  b: Board,
  v: Vehicle,
  lane: number,
): string | null {
  if (lane < 0 || lane > 2 || !Number.isInteger(lane))
    return "Choose one of the three lanes.";
  if (b[v.id] !== undefined) return "That vehicle is already aboard.";
  if (v.lanes && !v.lanes.includes(lane))
    return "This wide lorry needs the centre lane.";
  if (usage(m, b, lane) + v.length > m.capacity[lane])
    return `Not enough room in ${laneNames[lane]}. Try another lane or return a vehicle to the queue.`;
  return null;
}
export function canSail(m: Manifest, b: Board) {
  return (
    m.vehicles.every((v) => [0, 1, 2].includes(b[v.id])) &&
    Object.keys(b).every((id) => m.vehicles.some((v) => v.id === id)) &&
    difference(m, b) <= m.tolerance &&
    m.capacity.every((c, i) => usage(m, b, i) <= c) &&
    m.vehicles.every((v) => !v.lanes || v.lanes.includes(b[v.id]))
  );
}
export function solve(m: Manifest, b: Board = {}): Board | null {
  if (
    Object.keys(b).some(
      (id) =>
        !m.vehicles.some((v) => v.id === id) || ![0, 1, 2].includes(b[id]),
    )
  )
    return null;
  if (
    m.capacity.some((c, i) => usage(m, b, i) > c) ||
    m.vehicles.some(
      (v) => b[v.id] !== undefined && v.lanes && !v.lanes.includes(b[v.id]),
    )
  )
    return null;
  const remaining = m.vehicles
    .filter((v) => b[v.id] === undefined)
    .sort(
      (a, b) =>
        (a.lanes?.length ?? 3) - (b.lanes?.length ?? 3) ||
        b.length - a.length ||
        b.weight - a.weight,
    );
  function dfs(i: number, board: Board): Board | null {
    if (i === remaining.length) return canSail(m, board) ? board : null;
    const v = remaining[i];
    for (const lane of v.lanes ?? [0, 1, 2]) {
      if (!placementError(m, board, v, lane)) {
        const answer = dfs(i + 1, { ...board, [v.id]: lane });
        if (answer) return answer;
      }
    }
    return null;
  }
  return dfs(0, { ...b });
}
export function medal(m: Manifest, moves: number, hints: number) {
  return hints === 0 && moves <= m.vehicles.length
    ? 3
    : hints <= 1 && moves <= m.vehicles.length + 5
      ? 2
      : 1;
}
