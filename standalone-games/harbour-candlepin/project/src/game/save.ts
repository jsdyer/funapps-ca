const KEY = "harbour-candlepin";

export type SaveData = {
  version: 1;
  best: number;
  strings: number;
  sound: boolean;
  shake: boolean;
  guide: boolean;
};

const DEFAULTS: SaveData = {
  version: 1,
  best: 0,
  strings: 0,
  sound: true,
  shake: true,
  guide: true,
};

export function loadSave(): SaveData {
  if (typeof localStorage === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...DEFAULTS,
      ...parsed,
      version: 1,
      best: typeof parsed.best === "number" ? parsed.best : 0,
      strings: typeof parsed.strings === "number" ? parsed.strings : 0,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSave(patch: Partial<SaveData>): SaveData {
  const next = { ...loadSave(), ...patch, version: 1 as const };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode or quota — keep playing */
  }
  return next;
}
