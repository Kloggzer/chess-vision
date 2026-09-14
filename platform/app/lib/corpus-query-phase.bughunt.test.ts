import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { queryCorpus } from "@/lib/corpus-query";
import { DISAGREE } from "@/lib/query";

/**
 * `loadSession(name).catch(() => null)` plus the guard `if (session && …)` means an unreadable
 * log DISABLES the phase restriction for that recording instead of failing. The answer still
 * reports the phase it did not apply, so the lane labels unfiltered cells `settled`.
 */
const cell = (game: string, frame: string, square: string, fen: string, probs: Record<string, number>) =>
  JSON.stringify({ session_id: `rg-${game}`, frame, square, fen_label: fen, dirty_reason: null, probs });

test("a recording whose log cannot be read does not silently skip the phase filter", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-phase-"));
  await mkdir(path.join(root, "recordings", "a"), { recursive: true });
  await writeFile(path.join(root, "recordings", "a", "model-reads.jsonl"),
    cell("a", "000100", "a1", "wR", { wR: 0.2, wQ: 0.7 }) + "\n", "utf8");
  // No candidate.json, no log.jsonl — loadSession throws and the filter evaporates.
  process.env.CHESSLAB_DATA_DIR = root;

  const answer = await queryCorpus({ klass: DISAGREE, min: 0.5 }, "settled");
  expect(answer.cells, "BUG: an unreadable log turns the phase restriction off").toBe(0);
});
