export type Phase = "title" | "playing" | "payday" | "paused";

export type LobsterKind = "keeper" | "jumbo" | "small";

export type Lobster = {
  id: number;
  lbs: number;
  kind: LobsterKind;
};

export type HaulReason = "ready" | "fast" | "far" | "full" | "blue" | "busy" | "none";

export type Payday = {
  pounds: number;
  pay: number;
  bonus: number;
  stars: number;
  line: string;
  towed: boolean;
  count: number;
};

export type UiSnapshot = {
  phase: Phase;
  bell: number;
  grace: boolean;
  hold: Lobster[];
  holdMax: number;
  pounds: number;
  orderLb: number;
  price: number;
  canHaul: boolean;
  haulReason: HaulReason;
  canDock: boolean;
  hint: string;
  bumps: number;
  combo: number;
  sound: boolean;
  calm: boolean;
  bestLb: number;
  bestPay: number;
  mornings: number;
  payday: Payday | null;
  potsLeft: number;
  potTotal: number;
};

export type GameApi = {
  destroy: () => void;
  start: () => void;
  haul: () => void;
  dock: () => void;
  again: () => void;
  toggleSound: () => void;
  toggleCalm: () => void;
  togglePause: () => void;
  setTouch: (steer: number, throttle: number) => void;
};
