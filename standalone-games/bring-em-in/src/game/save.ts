import { SAVE_KEY } from "@/game/content";

export type SaveData = {
  version: 1;
  bestLb: number;
  bestPay: number;
  mornings: number;
  sound: boolean;
  calm: boolean;
};

const DEFAULT: SaveData = {
  version: 1,
  bestLb: 0,
  bestPay: 0,
  mornings: 0,
  sound: true,
  calm: false,
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT, calm: window.matchMedia("(prefers-reduced-motion: reduce)").matches };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    if (parsed.version !== 1) return { ...DEFAULT };
    return {
      version: 1,
      bestLb: num(parsed.bestLb),
      bestPay: num(parsed.bestPay),
      mornings: num(parsed.mornings),
      sound: parsed.sound !== false,
      calm: Boolean(parsed.calm),
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
