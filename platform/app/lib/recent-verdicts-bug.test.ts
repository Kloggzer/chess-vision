import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { judgedKeys, recentVerdicts } from "@/lib/corrections";

let dir: string;

const row = (label: string, ts: string) =>
  JSON.stringify({ session_id: "rg-rec-1", frame: "000001", square: "a1", label, ts }) + "\n";

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-recent-"));
  dir = path.join(root, "recordings", "rec-1");
  await mkdir(dir, { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
});

test("recentVerdicts shows the label that actually stands, even when the review row is newer", async () => {
  // Erst korrigiert, danach im selben Strom „FEN stimmt" gedrueckt: `reviewed` traegt den
  // spaeteren Zeitstempel. `judgedKeys` laesst die Korrektur gewinnen (Python liest nur sie),
  // `recentVerdicts` laesst die juengere Zeile gewinnen — zwei Sichten, zwei Labels.
  await writeFile(path.join(dir, "corrections.jsonl"), row("bB", "2026-09-01T00:00:00+00:00"), "utf8");
  await writeFile(path.join(dir, "reviewed.jsonl"), row("wP", "2026-09-02T00:00:00+00:00"), "utf8");

  expect((await judgedKeys("rec-1")).get("000001|a1")).toBe("bB");
  expect(
    (await recentVerdicts("rec-1", 10)).find((r) => `${r.frame}|${r.square}` === "000001|a1")?.label,
    "the recent view must show the correction that actually wins, not a newer review row",
  ).toBe("bB");
});
