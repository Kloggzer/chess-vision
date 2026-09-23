import { expect, test } from "vitest";
import { changeText, revertsTo, type Change } from "@/lib/label/history";

const change = (over: Partial<Change> = {}): Change => ({
  name: "g", sessionId: "rg-g", frame: "000100", square: "e5", label: "bB", before: "empty",
  fen_label: "bP", ledger: "corrections", retract: false, ts: "2026-09-08T08:00:00+00:00", ...over,
});

test("a retract falls back to the predecessor, and to the FEN when there was none", () => {
  expect(revertsTo(change())).toBe("empty");
  // Ohne Vorgaenger ist das FEN-Wort der ehrliche Wert — genau das, was `load_corrections` sonst nimmt.
  expect(revertsTo(change({ before: null }))).toBe("bP");
});

test("the card says what replaced what, and never invents a predecessor", () => {
  expect(changeText(change())).toBe("empty → bB");
  expect(changeText(change({ before: null }))).toBe("— → bB");
  expect(changeText(change({ retract: true }))).toBe("empty → bB (zurückgenommen)");
});
