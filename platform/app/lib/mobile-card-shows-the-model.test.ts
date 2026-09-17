/**
 * Die Handy-Karte zeigt EINE Zelle. Ohne das Wort des Modells daneben beantwortet der Mensch
 * "widerspricht das Modell der FEN?" ohne zu wissen, WAS es behauptet — die Lane sortiert danach
 * (`byClaim` in `lib/lanes.ts`), `judgedCell` legt es als `note` auf die Zelle, und die Karte
 * verschwieg es (Nutzer, 2026-09-17: "ich sehe nicht was es sein sollte und was das Modell
 * vorschlägt").
 *
 * Quelltext-Ratsche, weil dieses Projekt keine Render-Umgebung hat — dieselbe Form wie
 * `carry-unwired.bughunt.test.ts`.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const CARD = path.join(__dirname, "..", "app", "strom", "labeln", "mobile-sort.tsx");

test("die Handy-Karte liest das Wort des Modells", async () => {
  const source = await readFile(CARD, "utf8");

  expect(source, "`note` traegt `Modell <x>` — ohne es fragt die Karte nach etwas Unsichtbarem")
    .toMatch(/head\.note/);
});
