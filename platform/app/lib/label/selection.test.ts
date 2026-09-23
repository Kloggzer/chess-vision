import { expect, test } from "vitest";
import { confirmLabel, cycleNext, planBoard, planRejectAll, type PlanInput } from "@/lib/label/selection";

const SQUARES = ["a1", "b1", "c1", "d1"];
const BASE = { a1: "wP", b1: "wN", c1: "empty", d1: "empty" };

function board(over: Partial<PlanInput> = {}): PlanInput {
  return {
    squares: SQUARES,
    proposals: { a1: "occluded", b1: "occluded", c1: "occluded" },
    painted: {},
    base: BASE,
    onFile: BASE,
    ...over,
  };
}

test("a board arrives with every flag selected", () => {
  const plan = planBoard(board());
  expect(plan.selected).toEqual(["a1", "b1", "c1"]);
  expect(plan.rejected).toEqual([]);
  expect(plan.corrections).toEqual([
    { square: "a1", label: "occluded" },
    { square: "b1", label: "occluded" },
    { square: "c1", label: "occluded" },
  ]);
  expect(plan.labels).toEqual({ a1: "occluded", b1: "occluded", c1: "occluded", d1: "empty" });
  expect(confirmLabel(plan)).toBe("3 Zellen als occluded → nächstes Brett");
});

test("flags taken off leave the rest committable — the all-or-nothing bug", () => {
  const plan = planBoard(board({ painted: { b1: "wN", c1: "empty" } }));
  expect(plan.selected).toEqual(["a1"]);
  expect(plan.rejected).toEqual(["b1", "c1"]);
  expect(plan.corrections).toEqual([{ square: "a1", label: "occluded" }]);
  expect(confirmLabel(plan)).toBe("1 Zelle als occluded · 2 Flags ab → nächstes Brett");
});

test("a flag off is a review row, never a training row", () => {
  const plan = planBoard(board({ painted: { a1: "wP", b1: "wN", c1: "empty" } }));
  expect(plan.corrections).toEqual([]);
  expect(plan.rejected).toEqual(["a1", "b1", "c1"]);
  expect(plan.committed).toEqual([]);
  expect(confirmLabel(plan)).toBe("0 Zellen · 3 Flags ab → nächstes Brett");
});

test("a flag repainted to a third label writes that label and no review row", () => {
  const plan = planBoard(board({ painted: { a1: "bK" } }));
  expect(plan.selected).toEqual(["b1", "c1"]);
  expect(plan.rejected).toEqual([]);
  expect(plan.corrections).toContainEqual({ square: "a1", label: "bK" });
  expect(confirmLabel(plan)).toBe("3 Zellen → nächstes Brett");
});

test("paint outside the flags is committed with them", () => {
  const plan = planBoard(board({ painted: { d1: "occluded" } }));
  expect(plan.committed.map((r) => r.square)).toEqual(["a1", "b1", "c1", "d1"]);
  expect(confirmLabel(plan)).toBe("4 Zellen als occluded → nächstes Brett");
});

test("only PAINTED cells flush on navigate-away — a flag alone writes nothing", () => {
  const plan = planBoard(board({ painted: { d1: "occluded" } }));
  expect(plan.paintRows).toEqual([{ square: "d1", label: "occluded" }]);
});

test("a flag the file already answers counts as selected and writes nothing", () => {
  const onFile = { ...BASE, a1: "occluded" };
  const plan = planBoard(board({ onFile }));
  expect(plan.selected).toEqual(["a1", "b1", "c1"]);
  expect(plan.corrections.map((r) => r.square)).toEqual(["b1", "c1"]);
  expect(plan.committed).toHaveLength(3);
});

test("taking off a flag this session already wrote supersedes it instead of reviewing it", () => {
  const plan = planBoard(board({ onFile: { ...BASE, a1: "occluded" }, painted: { a1: "wP" } }));
  expect(plan.corrections).toContainEqual({ square: "a1", label: "wP" });
  expect(plan.rejected).toEqual([]);
});

test("a flagged cell is a two-cycle: one click off, one click back on (CONCEPT 4.2.1 case C)", () => {
  const at = { current: "occluded", proposal: "occluded", base: "wP", fen: "wP", brush: "occluded" };
  expect(cycleNext(at)).toBe("wP");
  // Was `empty` before 2026-08-15: restoring a flag cost two clicks ("3 of 12" took 8 interactions).
  expect(cycleNext({ ...at, current: "wP" })).toBe("occluded");
  expect(cycleNext({ ...at, current: "empty" })).toBe("occluded"); // painted elsewhere: back on
});

test("a flag the file ALREADY calls occluded frees the cell instead of painting empty", () => {
  const at = { current: "occluded", proposal: "occluded", base: "occluded", fen: "wP", brush: "occluded" };
  expect(cycleNext(at)).toBe("wP");
  expect(cycleNext({ ...at, current: "wP" })).toBe("occluded");
});

test("a flag whose base AND fen repeat the proposal still frees the cell in one click", () => {
  const at = { current: "occluded", proposal: "occluded", base: "occluded", fen: "occluded", brush: "occluded" };
  expect(cycleNext(at)).toBe("empty");
  expect(cycleNext({ ...at, current: "empty" })).toBe("occluded");
});

test("a FEN-unklar cell reaches the brush by click — that label is the lane's whole purpose", () => {
  // `labeling.py` DROPS an unknown cell unless a correction exists (CONCEPT.md D5), and here the
  // flag IS the FEN's word, so a cycle without the brush can only confirm or empty it.
  const at = { current: "wQ", proposal: "wQ", base: "wQ", fen: "wQ", brush: "wN" };
  expect(cycleNext(at)).toBe("wN");
  expect(cycleNext({ ...at, current: "wN" })).toBe("empty");
  expect(cycleNext({ ...at, current: "empty" })).toBe("wQ");

  const plan = planBoard({
    squares: ["a1"],
    proposals: { a1: "wQ" },
    painted: { a1: "wN" },
    base: { a1: "wQ" },
    onFile: { a1: "wQ" },
  });
  expect(plan.corrections).toEqual([{ square: "a1", label: "wN" }]);
  expect(plan.committed).toEqual([{ square: "a1", label: "wN" }]);
});

test("an unflagged cell keeps the three-step brush cycle", () => {
  const at = { current: "wP", base: "wP", fen: "wP", brush: "bK" };
  expect(cycleNext(at)).toBe("bK");
  expect(cycleNext({ ...at, current: "bK" })).toBe("empty");
  expect(cycleNext({ ...at, current: "empty" })).toBe("wP");
});

test("✗ drops every flag and keeps the brush strokes", () => {
  const plan = planRejectAll(board({ painted: { a1: "bK", d1: "occluded" } }));
  expect(plan.selected).toEqual([]);
  expect(plan.rejected).toEqual(["b1", "c1"]);
  expect(plan.corrections).toEqual([
    { square: "a1", label: "bK" },
    { square: "d1", label: "occluded" },
  ]);
});

const before = (at: { current: string; proposal?: string; base: string; fen: string; brush: string }) => {
  const order = [...new Set([at.proposal, at.base, at.fen, at.brush, "empty"].filter((l) => l !== undefined))];
  return order[(order.indexOf(at.current) + 1) % order.length];
};

/** Clicks it takes to get one cell from `current` to `target` under a cycle. */
function clicks(cycle: typeof before, at: { current: string; proposal?: string; base: string; fen: string; brush: string }, target: string): number {
  let current = at.current;
  for (let n = 1; n <= 8; n++) {
    current = cycle({ ...at, current });
    if (current === target) return n;
  }
  throw new Error(`${target} is not reachable from ${at.current}`);
}

test("the interaction table of CONCEPT 4.2.1 holds: no case worse, case C strictly better", () => {
  const cell = { current: "occluded", proposal: "occluded", base: "wR", fen: "wR", brush: "occluded" };
  const off = { ...cell, current: "wR" };

  const cases: [string, number, number][] = [
    ["A alle Flags richtig", 1, 1],
    ["B nichts verdeckt", 1, 1],
    // C: 3 of 12. Today: the button hunt, then each flag BACK ON; the loop: `f`, then one click.
    ["C 3 von 12", 1 + 3 * clicks(before, off, "occluded") + 1, 1 + 3 * clicks(cycleNext, off, "occluded") + 1],
    ["C' 3 von 12, einzeln", 9 * clicks(before, cell, "wR") + 1, 9 * clicks(cycleNext, cell, "wR") + 1],
    ["D 9 von 12", 3 * clicks(before, cell, "wR") + 1, 3 * clicks(cycleNext, cell, "wR") + 1],
    // E and F are brush gestures and touch no cycle: key + drag + Enter, `a` + erase + Enter.
    ["E zwei Zellen umpinseln", 3, 3],
    ["F Hand über dem Brett", 3, 3],
  ];

  for (const [name, today, loop] of cases) expect([name, loop <= today]).toEqual([name, true]);
  expect(cases.map(([name, today, loop]) => `${name}: ${today} → ${loop}`)).toEqual([
    "A alle Flags richtig: 1 → 1",
    "B nichts verdeckt: 1 → 1",
    "C 3 von 12: 8 → 5",
    "C' 3 von 12, einzeln: 10 → 10",
    "D 9 von 12: 4 → 4",
    "E zwei Zellen umpinseln: 3 → 3",
    "F Hand über dem Brett: 3 → 3",
  ]);
});
