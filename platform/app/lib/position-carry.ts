import type { Labels, Row } from "@/lib/selection";

export type CarryFrame = {
  session: number;
  stem: string;
  ply: number;
};

export type PositionPrefills = Record<string, Labels>;

export function verifyFrameKey(frame: CarryFrame): string {
  return `${frame.session}|${frame.stem}`;
}

function sameLabels(a: Labels, b: Labels): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

// ENTSCHIEDEN 2026-09-16 (Nutzer: "natuerlich nicht ungefragt"): bleibt UNVERDRAHTET.
// `planBoard` legt ein `prefilled` in `corrections` und damit auf den Bestaetigen-Knopf — wer
// schnell bestaetigt, schriebe Labels, die er nie angesehen hat. Die Gegenseite steht bereit,
// das Anschliessen ist ein Aufruf; es braucht dann aber einen eigenen Knopf.
// `carry-unwired.bughunt.test.ts` haelt den Zustand fest.
export function carryPositionCorrections(input: {
  frames: readonly CarryFrame[];
  from: number;
  corrections: readonly Row[];
  decided: readonly Record<string, string>[];
  current: PositionPrefills;
}): { prefilled: PositionPrefills; count: number } {
  const source = input.frames[input.from];
  if (!source) return { prefilled: input.current, count: 0 };

  const prefilled = { ...input.current };
  let count = 0;

  for (let index = input.from + 1; index < input.frames.length; index += 1) {
    const target = input.frames[index];
    if (target.session !== source.session || target.ply !== source.ply) continue;

    const key = verifyFrameKey(target);
    const next: Labels = {};
    const decided = input.decided[target.session] ?? {};

    for (const row of input.corrections) {
      if (decided[`${target.stem}|${row.square}`] !== undefined) continue;
      next[row.square] = row.label;
    }

    const before = prefilled[key] ?? {};
    const changed = !sameLabels(before, next);

    if (Object.keys(next).length > 0) {
      prefilled[key] = next;
      if (changed) count += 1;
    } else {
      delete prefilled[key];
    }
  }

  return { prefilled, count };
}