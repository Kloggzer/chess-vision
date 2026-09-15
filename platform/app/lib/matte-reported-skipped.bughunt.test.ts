import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { tempDataRoot, writeLog } from "@/lib/test-fixtures";

/**
 * `matteCensus` once counted EVERY line of `matte.jsonl`, `skipped` rows included, where
 * `usableStemsIn` excludes them because no alpha is on disk. A reported frame SAM refused counted
 * as matted, `reported` dropped to 0, and `runChesslab` never pushed `--reported`: the frame was
 * unreachable with no surface saying so. `usableStemsIn` decides since; pinned here.
 */
let dir: string;

beforeEach(async () => {
  dir = await tempDataRoot("reported");
  const rec = path.join(dir, "recordings", "g");
  await mkdir(rec, { recursive: true });
  await writeLog(rec, [{ frame: 2, dirty: true, extra: { dirty_reason: "stale" } }]);
  // What `matte.py` writes when SAM refuses: a frame, no alpha, no coverage.
  await writeFile(path.join(rec, "matte.jsonl"),
    JSON.stringify({ frame: "000002", skipped: "board unreadable" }) + "\n", "utf8");
  await mkdir(path.join(dir, "labels"), { recursive: true });
  await writeFile(path.join(dir, "labels", "review-notes.jsonl"),
    JSON.stringify({ session_id: "rg-g", frame: "000002", verdict: "dirty-frame" }) + "\n", "utf8");
});

test("a reported frame SAM refused still counts as reported", async () => {
  const { matteCensus } = await import("@/lib/matte");
  const census = await matteCensus("g");
  expect(census.reported, "BUG: a `skipped` row is read as a matte, so --reported never fires").toBe(1);
});
