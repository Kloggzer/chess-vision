import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { nextStep } from "@/lib/chain";
import { tempDataRoot, writeLog } from "@/lib/test-fixtures";

/**
 * Ein gemeldetes Frame, das SAM ABGELEHNT hat, steht nie in `usable` — `reported` blieb damit
 * fuer immer > 0 und `nextStep` bot bis in alle Ewigkeit `matte` an. Sichtbar bleiben soll es
 * (`matte-reported-skipped.bughunt.test.ts` haelt das fest), die Kette aufhalten nicht.
 */
let dir: string;

beforeEach(async () => {
  dir = await tempDataRoot("reported-blocks");
  const rec = path.join(dir, "recordings", "g");
  await mkdir(rec, { recursive: true });
  await writeLog(rec, [{ frame: 2, dirty: true, extra: { dirty_reason: "stale" } }]);
  await writeFile(path.join(rec, "matte.jsonl"),
    JSON.stringify({ frame: "000002", skipped: "board unreadable" }) + "\n", "utf8");
  await mkdir(path.join(dir, "labels"), { recursive: true });
  await writeFile(path.join(dir, "labels", "review-notes.jsonl"),
    JSON.stringify({ session_id: "rg-g", frame: "000002", verdict: "dirty-frame" }) + "\n", "utf8");
});

const EXPORTED = {
  video: "v", videoBroken: null, offeredPgn: null, hasReference: false, hasPhoneRecord: false,
  hasCandidate: true, confirmed: true, hasSession: true,
  hasSettle: true, outdated: {}, reason: "", hasTemporalPass: true, hasModelReads: true, useless: null,
};

test("a frame SAM already refused is reported but no longer open", async () => {
  const { matteCensus } = await import("@/lib/matte");
  const census = await matteCensus("g");
  expect(census.reported, "sichtbar bleibt es").toBe(1);
  expect(census.reportedOpen, "BUG: SAM hat geantwortet, die Kette wartet trotzdem weiter").toBe(0);
});

test("nextStep leaves the matte rung once every reported frame got its answer", () => {
  const stuck = { done: 80, total: 80, target: 80, reported: 1, reportedOpen: 0, reportedOrphan: 0 };
  expect(nextStep({ ...EXPORTED, mattes: stuck }).step, "BUG: dauerhaft auf `matte` festgenagelt").toBe("labeln");
});

test("a reported frame SAM has not answered yet still calls for the step", () => {
  const open = { done: 80, total: 80, target: 80, reported: 1, reportedOpen: 1, reportedOrphan: 0 };
  expect(nextStep({ ...EXPORTED, mattes: open }).step).toBe("matte");
});
