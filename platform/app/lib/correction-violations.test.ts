import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { gemessen, tempDataRoot } from "@/lib/test-fixtures";

let dir: string;
beforeEach(async () => {
  dir = await tempDataRoot("violations");
  await mkdir(path.join(dir, "reports"), { recursive: true });
  (globalThis as { __chesslabMeasurements?: Map<string, unknown> }).__chesslabMeasurements?.clear();
});

const load = () => import("@/lib/correction-violations");
const write = (text: string) => writeFile(path.join(dir, "reports", "correction-violations.jsonl"), text, "utf8");

const ROW =
  '{"session_id": "rg-2026-08-08-11-55-19", "frame": "000822", "ply": 12, ' +
  '"violations": ["TOO_MANY_WHITE_PAWNS", "PAWNS_ON_BACKRANK"], "corrections": {"e1": "wP"}}';

test("a row carries its rules and the squares its corrections touched", async () => {
  const { loadCorrectionViolations } = await load();
  await write(`${ROW}\n`);
  const { rows } = gemessen(await loadCorrectionViolations());
  expect(rows).toEqual([
    {
      session_id: "rg-2026-08-08-11-55-19",
      frame: "000822",
      ply: 12,
      violations: ["TOO_MANY_WHITE_PAWNS", "PAWNS_ON_BACKRANK"],
      corrections: { e1: "wP" },
    },
  ]);
});

test("no file is NOT MEASURED, which is what the chip renders as `—` — instead of 0", async () => {
  const { loadCorrectionViolations, correctionViolationsPath } = await load();
  expect(correctionViolationsPath()).toBe(path.join(dir, "reports", "correction-violations.jsonl"));
  expect(await loadCorrectionViolations()).toEqual({ measured: false });
});

test("a half-written line, a rule-less row and a correction-less row are skipped, not fatal", async () => {
  const { loadCorrectionViolations } = await load();
  await write(
    [
      ROW,
      '{"session_id": "rg-a", "frame": "1", "violations": [], "corrections": {"e1": "wP"}}',
      '{"session_id": "rg-a", "frame": "2", "violations": ["TOO_MANY_KINGS"], "corrections": {}}',
      '{"session_id": "rg-a", "fra',
    ].join("\n"),
  );
  const { rows } = gemessen(await loadCorrectionViolations());
  expect(rows.map((r) => r.frame)).toEqual(["000822"]);
});

test("the read path is mtime-keyed, so a re-run of the audit is seen", async () => {
  const { loadCorrectionViolations } = await load();
  await write(`${ROW}\n`);
  expect(gemessen(await loadCorrectionViolations()).rows).toHaveLength(1);
  await write("");
  expect(gemessen(await loadCorrectionViolations()).rows).toEqual([]);
});
