/**
 * Acht Knoepfe, sechs davon auf 0 — und dieselben Zahlen stehen oben in der Einpflegen-Ansicht
 * schon als Filterleiste. Seit es den Ketten-Drain gibt, ist der einzelne Schritt die Ausnahme:
 * er lohnt, wenn man NUR das Matten laufen lassen will, nicht als Dauerzustand.
 */
import { expect, test } from "vitest";
import { visibleSteps, type Lane } from "@/lib/step-lane";

const none: Lane["waiting"] = {
  "phone-record": 0, label: 0, export: 0, "settle-scan": 0, matte: 0, temporal: 0, "model-read": 0,
};

test("ohne Wartende bleibt nur die Kette", () => {
  expect(visibleSteps({ waiting: none, running: null })).toEqual(["chain"]);
});

test("eine Sprosse mit Wartenden steht neben der Kette", () => {
  expect(visibleSteps({ waiting: { ...none, matte: 1 }, running: null }))
    .toEqual(["chain", "matte"]);
});

test("die Reihenfolge ist die der Kette, nicht die der Zahlen", () => {
  const lane = visibleSteps({ waiting: { ...none, "model-read": 9, export: 1 }, running: null });
  expect(lane).toEqual(["chain", "export", "model-read"]);
});

test("was laeuft, bleibt sichtbar — auch wenn nichts mehr darauf wartet", () => {
  // Sonst verschwindet der Knopf unter dem Finger, waehrend sein Job noch arbeitet.
  expect(visibleSteps({ waiting: none, running: "temporal" })).toEqual(["chain", "temporal"]);
});

test("ein laufender Schritt wird nicht doppelt gefuehrt", () => {
  expect(visibleSteps({ waiting: { ...none, matte: 3 }, running: "matte" }))
    .toEqual(["chain", "matte"]);
});
