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

// TODO: unverdrahtet — `board-paint` verarbeitet `prefilled` bis in `planBoard`, aber niemand
// reicht es hinein. Verdrahten ist eine Produktentscheidung (welche Korrektur auf welches Brett
// wandert), siehe docs/offene-entscheidungen.md.
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