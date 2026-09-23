/** Die Vorschau zeigt nur die Matte (Nutzer, 2026-09-17); der Rillen-Sensor nannte nur 53,8 % der Matte-Hand. */
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
  // Kein Rueckfall auf den Rillen-Sensor: ein Vorfilter, der wie eine Messung aussieht, ist schlimmer als eine Leerstelle.
  expect(matteOverlay(undefined, "/api/matte/rec/000100?size=384")).toEqual({
    src: null,
    measured: false,
    covered: 0,
  });
});
