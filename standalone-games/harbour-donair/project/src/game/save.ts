const KEY = "harbour-donair-v1";

export type SaveData = {
  version: 1;
  bestPizzas: number;
  bestTips: number;
  bestCombo: number;
  shifts: number;
  sound: boolean;
  shake: boolean;
};

const fallback = (): SaveData => ({
  version: 1,
  bestPizzas: 0,
  bestTips: 0,
  bestCombo: 0,
  shifts: 0,
  sound: true,
  shake: true,
});

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (!parsed || parsed.version !== 1) return fallback();
    return { ...fallback(), ...parsed, version: 1 };
  } catch {
    return fallback();
  }
}

export function writeSave(data: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
