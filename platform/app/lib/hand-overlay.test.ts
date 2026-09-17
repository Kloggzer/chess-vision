/**
 * Die Brett-Vorschau zeigt die MATTE und sonst nichts (Nutzer, 2026-09-17: "anstelle der gelben
 * kaesten die matte eintragen und sicherstellen dass nur die occlusion aus der mattelane da ist").
 *
 * Der Rillen-Sensor ist raus: er nannte auf `2026-08-08-11-59-12` nur 53,8 % der Matte-Hand und
 * sah dabei aus wie die ganze. Und ein Frame OHNE Matte ist nicht handfrei, sondern ungemessen —
 * das muss die Vorschau sagen, nicht verschweigen (CLAUDE.md, "Coverage Matte Trap").
 */
import { expect, test } from "vitest";

import { matteOverlay } from "@/lib/hand-overlay";

test("eine gemessene Matte wird gezeigt — mit ihrem eigenen Alpha, nicht als Kaesten", () => {
  const seen = matteOverlay({ e4: 0.9, d4: 0.02 }, "/api/matte/rec/000100?size=384");

  expect(seen).toEqual({ src: "/api/matte/rec/000100?size=384", measured: true, covered: 1 });
});

test("eine gemessene Matte OHNE Hand ist eine Aussage, kein Fehlen", () => {
  const seen = matteOverlay({ e4: 0.01 }, "/api/matte/rec/000100?size=384");

  expect(seen.measured).toBe(true);
  expect(seen.covered).toBe(0);
  expect(seen.src, "das leere Alpha gehoert gezeigt — es ist die Messung").not.toBeNull();
});

test("ohne Matte wird NICHTS gezeigt und nichts behauptet", () => {
  // Kein Rueckfall auf den Rillen-Sensor: ein grober Vorfilter, der wie eine Messung aussieht,
  // ist schlimmer als eine Leerstelle, die sich zu erkennen gibt.
  expect(matteOverlay(undefined, "/api/matte/rec/000100?size=384")).toEqual({
    src: null,
    measured: false,
    covered: 0,
  });
});
