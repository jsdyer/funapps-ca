/** Candlepin scoring: 10 frames, 3 balls, deadwood is a physics concern not a score concern. */

export type Roll = {
  pins: number;
  isStrike: boolean;
  isSpare: boolean;
  gutter: boolean;
};

export type Match = {
  /** 0–9 */
  frameIndex: number;
  rolls: Roll[][];
  /** 0, 1, or 2 — which ball this is on the current rack */
  ballOnRack: number;
  rackFull: boolean;
  over: boolean;
};

export function emptyMatch(): Match {
  return {
    frameIndex: 0,
    rolls: Array.from({ length: 10 }, () => []),
    ballOnRack: 0,
    rackFull: true,
    over: false,
  };
}

export type Action = "keep" | "reset" | "next" | "over";

/**
 * Record one delivery.
 * Strike: first ball on a full rack clears all 10.
 * Spare: the second ball of the frame clears the rest, and the first was not a strike.
 * A third-ball clear is just wood —  no bonus.
 * Tenth frame always allows three balls; strikes and spares reset the rack for the fill.
 */
export function applyDelivery(
  match: Match,
  knocked: number,
  standing: number,
  startStanding: number,
  gutter: boolean,
): { match: Match; action: Action; roll: Roll } {
  const frameRolls = match.rolls[match.frameIndex] ?? [];
  const rollIndex = frameRolls.length;
  const isStrike = match.rackFull && startStanding === 10 && standing === 0;
  const firstWasStrike = frameRolls[0]?.isStrike ?? false;
  const isSpare =
    rollIndex === 1 && standing === 0 && !firstWasStrike && !isStrike;
  const pins = isStrike ? 10 : Math.max(0, Math.min(10, knocked));
  const roll: Roll = { pins, isStrike, isSpare, gutter: gutter && pins === 0 };

  const rolls = match.rolls.map((frame, i) =>
    i === match.frameIndex ? [...frame, roll] : frame.slice(),
  );
  const frame = rolls[match.frameIndex] ?? [];
  const n = frame.length;
  const tenth = match.frameIndex === 9;

  let action: Action;
  if (!tenth) {
    if (isStrike || isSpare || standing === 0 || match.ballOnRack >= 2) action = "next";
    else action = "keep";
  } else if (n >= 3) {
    action = "over";
  } else if (n === 1 && isStrike) {
    action = "reset";
  } else if (n === 1) {
    action = "keep";
  } else if (n === 2 && frame[0]?.isStrike && frame[1]?.isStrike) {
    action = "reset";
  } else if (n === 2 && frame[0]?.isStrike) {
    action = "keep";
  } else if (n === 2 && isSpare) {
    action = "reset";
  } else if (n === 2) {
    action = "keep";
  } else {
    action = "over";
  }

  let next: Match;
  if (action === "keep") {
    next = { ...match, rolls, ballOnRack: match.ballOnRack + 1, rackFull: false, over: false };
  } else if (action === "reset") {
    next = { ...match, rolls, ballOnRack: 0, rackFull: true, over: false };
  } else if (action === "next") {
    next = {
      ...match,
      rolls,
      frameIndex: match.frameIndex + 1,
      ballOnRack: 0,
      rackFull: true,
      over: false,
    };
  } else {
    next = { ...match, rolls, over: true };
  }

  return { match: next, action, roll };
}

/** Cumulative score per frame. Null until that frame's bonuses are known. */
export function cumulative(rolls: Roll[][]): (number | null)[] {
  const flat: number[] = [];
  const start: number[] = [];
  for (let i = 0; i < 10; i++) {
    start.push(flat.length);
    for (const roll of rolls[i] ?? []) flat.push(roll.pins);
  }

  const out: (number | null)[] = [];
  let run = 0;
  let locked = false;
  for (let i = 0; i < 10; i++) {
    const frame = rolls[i] ?? [];
    const st = start[i] ?? 0;
    let pts: number | null = null;
    if (!locked && frame.length > 0) {
      if (i < 9) {
        if (frame[0]?.isStrike) {
          if (flat.length >= st + 3) pts = 10 + (flat[st + 1] ?? 0) + (flat[st + 2] ?? 0);
        } else if (frame[1]?.isSpare) {
          if (flat.length >= st + 3) pts = 10 + (flat[st + 2] ?? 0);
        } else if (frame.length >= 3) {
          pts = (frame[0]?.pins ?? 0) + (frame[1]?.pins ?? 0) + (frame[2]?.pins ?? 0);
        }
      } else if (frame.length >= 3) {
        pts = frame.reduce((sum, roll) => sum + roll.pins, 0);
      }
    }
    if (pts === null) {
      out.push(null);
      locked = true;
    } else {
      run += pts;
      out.push(run);
    }
  }
  return out;
}

export function confirmedTotal(cumul: (number | null)[]): number | null {
  let last: number | null = null;
  for (const value of cumul) {
    if (value === null) break;
    last = value;
  }
  return last;
}

export function countMarks(rolls: Roll[][]): { strikes: number; spares: number } {
  let strikes = 0;
  let spares = 0;
  for (const frame of rolls) {
    for (const roll of frame) {
      if (roll.isStrike) strikes += 1;
      if (roll.isSpare) spares += 1;
    }
  }
  return { strikes, spares };
}

export function blurb(score: number): string {
  if (score >= 200) return "Go home. Tell it slowly. They will not believe you.";
  if (score >= 170) return "That's a story for the ferry ride back.";
  if (score >= 150) return "The house board just looked up.";
  if (score >= 130) return "A real string. Get yourself a coffee after.";
  if (score >= 110) return "Halifax would approve of that.";
  if (score >= 90) return "Solid wood. The pins were listening.";
  if (score >= 70) return "A fair fight with a skinny rack.";
  if (score >= 50) return "Fog on the lane. You stayed for the whole string.";
  return "Rough water. The next string is kinder.";
}

export function rollGlyph(roll: Roll | undefined): string {
  if (!roll) return "";
  if (roll.isStrike) return "X";
  if (roll.isSpare) return "/";
  if (roll.gutter) return "–";
  return String(roll.pins);
}
