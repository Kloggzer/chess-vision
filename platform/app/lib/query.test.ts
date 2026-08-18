import { expect, test } from "vitest";
import {
  DEFAULT_WALL,
  DISAGREE,
  STEPS,
  acceptLabel,
  contradicts,
  matches,
  queryText,
  type ModelRead,
} from "@/lib/query";

const row = (over: Partial<ModelRead> = {}): ModelRead => ({
  session_id: "rg-g", frame: "000100", square: "a1", fen_label: "wR",
  probs: { wR: 0.3, wQ: 0.6, occluded: 0.05 }, ...over,
});

test("Klassenwand asks for a class WHERE THE FEN SAYS OTHERWISE, which matches alone does not", () => {
  // `matches` answers "P(wR) >= 0.25" on a cell the FEN already calls wR — a wall of agreement.
  expect(matches(row(), { klass: "wR", min: 0.25 })).toBe(true);
  expect(contradicts(row(), { klass: "wR", min: 0.25 })).toBe(false);
  expect(contradicts(row(), { klass: "wQ", min: 0.25 })).toBe(true);
  expect(contradicts(row(), { klass: "wQ", min: 0.75 })).toBe(false);
  // Below 0.5 the documented predicate is genuinely wider than the argmax: two classes can pass.
  expect(contradicts(row(), { klass: DISAGREE, min: 0.25 })).toBe(true);
  expect(contradicts(row({ probs: { wR: 0.6, wQ: 0.3 } }), { klass: "wQ", min: 0.25 })).toBe(true);
  expect(contradicts(row({ probs: { wR: 0.6, wQ: 0.3 } }), { klass: DISAGREE, min: 0.25 })).toBe(false);
  // A row with no model read answers nothing at all — and `occluded` is no longer a question the
  // wall can ask: coverage is measured per square (`matte.jsonl`), never queried out of a score.
  expect(contradicts(row({ probs: undefined }), { klass: "wQ", min: 0.05 })).toBe(false);
  expect(contradicts(row({ probs: undefined }), { klass: "occluded", min: 0.5 })).toBe(false);
});

test("a threshold query is answered by its own class, a disagree query by the top read", () => {
  expect(acceptLabel(row(), { klass: "wQ", min: 0.25 })).toBe("wQ");
  // Even where the argmax is something else: a threshold question is not an argmax question.
  expect(acceptLabel(row({ probs: { wR: 0.1, wQ: 0.3, wB: 0.6 } }), { klass: "wQ", min: 0.25 })).toBe("wQ");
  expect(acceptLabel(row(), { klass: DISAGREE, min: 0.25 })).toBe("wQ");
  expect(acceptLabel(row({ probs: undefined }), { klass: DISAGREE, min: 0.25 })).toBeNull();
});

test("the query prints itself, and the steps are the ones the old bar offered", () => {
  expect(queryText({ klass: "bQ", min: 0.5 })).toBe("bQ ≥ 0.5");
  expect(queryText(DEFAULT_WALL)).toBe("Modell ≠ FEN ab 0.9");
  expect(STEPS).toEqual([0.05, 0.1, 0.25, 0.5, 0.75, 0.9]);
});
