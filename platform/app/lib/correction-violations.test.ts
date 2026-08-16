import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "violations-"));
  await mkdir(path.join(dir, "manifests"), { recursive: true });
  vi.doMock("@/lib/data", () => ({ dataDir: () => dir }));
  vi.resetModules();
  (globalThis as { __chesslabViolations?: Map<string, unknown> }).__chesslabViolations?.clear();
});
afterEach(() => vi.doUnmock("@/lib/data"));

const load = () => import("@/lib/correction-violations");
const write = (text: string) => writeFile(path.join(dir, "manifests", "correction-violations.jsonl"), text, "utf8");

const ROW =
  '{"session_id": "rg-2026-08-08-11-55-19", "frame": "000822", "ply": 12, ' +
  '"violations": ["TOO_MANY_WHITE_PAWNS", "PAWNS_ON_BACKRANK"], "corrections": {"e1": "wP"}}';

test("a row carries its rules and the squares its corrections touched", async () => {
  const { loadCorrectionViolations } = await load();
  await write(`${ROW}\n`);
  const { rows, present } = await loadCorrectionViolations();
  expect(present).toBe(true);
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

test("no file is `present: false`, which is what the chip renders as — instead of 0", async () => {
  const { loadCorrectionViolations, correctionViolationsPath } = await load();
  expect(correctionViolationsPath()).toBe(path.join(dir, "manifests", "correction-violations.jsonl"));
  expect(await loadCorrectionViolations()).toEqual({ rows: [], present: false });
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
  const { rows } = await loadCorrectionViolations();
  expect(rows.map((r) => r.frame)).toEqual(["000822"]);
});

test("the read path is mtime-keyed, so a re-run of the audit is seen", async () => {
  const { loadCorrectionViolations } = await load();
  await write(`${ROW}\n`);
  expect((await loadCorrectionViolations()).rows).toHaveLength(1);
  await write("");
  expect((await loadCorrectionViolations()).rows).toEqual([]);
});
