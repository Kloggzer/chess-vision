/**
 * Die Brett-Vorschau zeichnete den RILLEN-Sensor und nannte ihn "die Hand, sichtbar". Gemessen
 * auf `2026-08-08-11-59-12` (435 Frames): 99,6 % des Gelbs liegt richtig, aber nur 53,8 % der
 * Matte-Hand ist gelb — die Anzeige ist nicht verschoben, sie ist halb blind.
 */
import { expect, test } from "vitest";

import { handOverlay } from "@/lib/hand-overlay";

test("die Matte ist die Messung — sie gewinnt, wo es sie gibt", () => {
  const seen = handOverlay({ e4: 0.9, d4: 0.2, a1: 0.01 }, ["e4"]);

  expect(seen).toEqual({ squares: ["d4", "e4"], source: "matte" });
});

test("ohne Matte bleibt der Rillen-Sensor — halb blind ist besser als blind", () => {
  expect(handOverlay(undefined, ["e4", "d4"])).toEqual({ squares: ["d4", "e4"], source: "grid" });
});

test("eine gemessene Matte ohne Hand ist eine AUSSAGE, kein Rueckfall auf die Rillen", () => {
  // Sonst zeigte ein Frame, dessen Matte sagt "nichts drauf", trotzdem das Gelb des Vorfilters.
  expect(handOverlay({ e4: 0.01 }, ["e4"])).toEqual({ squares: [], source: "matte" });
});

test("kein Messwert von beiden: nichts behaupten", () => {
  expect(handOverlay(undefined, [])).toEqual({ squares: [], source: "none" });
});
