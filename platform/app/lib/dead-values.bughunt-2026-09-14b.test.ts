import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

/**
 * Was am 2026-09-14 als wertlos entfernt wurde — und was sich dabei als WERTVOLL herausstellte.
 *
 * `prob` und `margin` wanderten in jede `StreamAuditCell` und wurden nie gelesen: `judgedCell`
 * nahm sie entgegen und wertete sie nicht aus, und `wallCells` schob konstant `prob: 0` hinein.
 * `model_cov` sah genauso aus, steht aber in der Bildunterschrift der Lane — der Verdacht war falsch.
 */
const APP = process.cwd();

it("prob und margin bleiben aus der Audit-Zelle draussen", async () => {
  const stream = await readFile(path.join(APP, "lib", "label-stream.ts"), "utf8");
  const audit = stream.slice(stream.indexOf("StreamAuditCell"), stream.indexOf("StreamAuditCell") + 400);

  expect(audit, "wer sie zurueckholt, bringt den Leser mit").not.toMatch(/margin\s*:/);
});

// Der zweite Fall — `cov`, heute `model_cov` — war ein Quelltext-Grep auf `lanes.ts`. Dieselbe
// Tatsache prueft `lanes.test.ts` am Verhalten ("die Hand-Lane fragt nach der Hand": die Caption
// traegt die 82 % des Modells). Ein Grep, der beim Umbenennen bricht, deckt nichts zusaetzlich.
