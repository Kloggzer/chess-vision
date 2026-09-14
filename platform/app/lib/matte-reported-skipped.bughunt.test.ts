import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

/**
 * `matteStems` regexes `"frame"` out of EVERY line of `matte.jsonl`, `skipped` rows included —
 * while `usableStemsIn` ten lines above deliberately excludes them because no alpha is on disk.
 * A reported frame SAM refused therefore counts as matted, `reported` drops to 0, and
 * `jobs.ts:897` never pushes `--reported`: the frame is unreachable with no surface saying so.
 */
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "chesslab-reported-"));
  process.env.CHESSLAB_DATA_DIR = dir;
  const rec = path.join(dir, "recordings", "g");
  await mkdir(rec, { recursive: true });
  await writeFile(path.join(rec, "log.jsonl"),
    JSON.stringify({ frame: "frames/000002.png", board: "boards/000002.webp", dirty: true, dirty_reason: "stale" }) + "\n",
    "utf8");
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
