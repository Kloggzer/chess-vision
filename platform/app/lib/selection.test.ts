import { expect, test } from "vitest";
import { confirmLabel, cycleNext, planBoard, planRejectAll, type PlanInput } from "@/lib/selection";

/** Four squares are enough: three flagged, one clean. `d1` is the cell no filter pointed at. */
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
  expect(confirmLabel(plan)).toBe("confirm 3 cells as occluded → next board");
});

test("flags taken off leave the rest committable — the all-or-nothing bug", () => {
  const plan = planBoard(board({ painted: { b1: "wN", c1: "empty" } }));
  expect(plan.selected).toEqual(["a1"]);
  expect(plan.rejected).toEqual(["b1", "c1"]);
  expect(plan.corrections).toEqual([{ square: "a1", label: "occluded" }]);
  expect(confirmLabel(plan)).toBe("confirm 1 cell as occluded · 2 flags off → next board");
});

test("a flag off is a review row, never a training row", () => {
  const plan = planBoard(board({ painted: { a1: "wP", b1: "wN", c1: "empty" } }));
  expect(plan.corrections).toEqual([]);
  expect(plan.rejected).toEqual(["a1", "b1", "c1"]);
  expect(plan.committed).toEqual([]);
  expect(confirmLabel(plan)).toBe("confirm 0 cells · 3 flags off → next board");
});

test("a flag repainted to a third label writes that label and no review row", () => {
  const plan = planBoard(board({ painted: { a1: "bK" } }));
  expect(plan.selected).toEqual(["b1", "c1"]);
  expect(plan.rejected).toEqual([]);
  expect(plan.corrections).toContainEqual({ square: "a1", label: "bK" });
  expect(confirmLabel(plan)).toBe("confirm 3 cells → next board");
});

test("paint outside the flags is committed with them", () => {
  const plan = planBoard(board({ painted: { d1: "occluded" } }));
  expect(plan.committed.map((r) => r.square)).toEqual(["a1", "b1", "c1", "d1"]);
  expect(confirmLabel(plan)).toBe("confirm 4 cells as occluded → next board");
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

test("the first click on a flag takes it off, it does not paint", () => {
  const at = { current: "occluded", proposal: "occluded", base: "wP", fen: "wP", brush: "occluded" };
  expect(cycleNext(at)).toBe("wP");
  expect(cycleNext({ ...at, current: "wP" })).toBe("empty");
  expect(cycleNext({ ...at, current: "empty" })).toBe("occluded"); // and back on
});

test("a flag the file ALREADY calls occluded frees the cell instead of painting empty", () => {
  const at = { current: "occluded", proposal: "occluded", base: "occluded", fen: "wP", brush: "occluded" };
  expect(cycleNext(at)).toBe("wP");
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
