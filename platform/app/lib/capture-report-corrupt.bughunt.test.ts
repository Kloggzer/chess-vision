import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { loadCoverage, loadPlan } from "@/lib/capture-plan";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * Der `catch` beantwortet JEDEN Lesefehler mit "der Befehl lief noch nie" und nennt den Befehl,
 * der die Datei ueberschreibt. Eine halb geschriebene `capture-plan.json` — der Producer schreibt
 * ohne tmp+rename — sieht am Handy damit aus wie ein nie erzeugter Plan: `shots: []` heisst dort
 * "nichts aufzunehmen", und der Hinweis raet ausgerechnet zum Ueberschreiben.
 */
let reports = "";

beforeEach(async () => {
  const root = await tempDataRoot("capture-corrupt");
  reports = path.join(root, "reports");
  await mkdir(reports, { recursive: true });
});

test("Kontrolle: eine fehlende Datei nennt zu Recht den Befehl", async () => {
  expect(await loadPlan()).toEqual({ shots: [], why: expect.stringContaining("capture plan") });
});

test("eine halb geschriebene `capture-plan.json` ist kein ungelaufener Befehl", async () => {
  await writeFile(path.join(reports, "capture-plan.json"), '{"shots": [{"id": "01"', "utf8");
  await expect(
    loadPlan(),
    "BUG: aus dem Parse-Fehler wird `shots: []` plus der Rat, die Datei zu ueberschreiben",
  ).rejects.toThrow();
});

test("eine halb geschriebene `coverage-gaps.json` ist keine fehlende Abdeckung", async () => {
  await writeFile(path.join(reports, "coverage-gaps.json"), '{"gaps": [', "utf8");
  await expect(
    loadCoverage(),
    "BUG: derselbe `catch` — ein kaputter Bericht liest sich als nie gerechneter",
  ).rejects.toThrow();
});
