import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { queryCorpus } from "@/lib/corpus/corpus-query";
import { DISAGREE } from "@/lib/query";
import { tempDataRoot } from "@/lib/test-fixtures";

const cell = (game: string, frame: string, square: string, fen: string, probs: Record<string, number>) =>
  JSON.stringify({ session_id: `rg-${game}`, frame, square, fen_label: fen, dirty_reason: null, probs });

/** Two games, so the answer has to be corpus-wide and not one session's (`api/filter/[name]`). */
async function corpus() {
  const root = await tempDataRoot("corpus-query");
  for (const [game, lines] of [
    ["a", [
      cell("a", "000100", "a1", "wR", { wR: 0.2, wQ: 0.7 }),
      cell("a", "000100", "b1", "wN", { wN: 0.9 }),
      cell("a", "000200", "c1", "wB", { wB: 0.3, wQ: 0.55 }),
    ]],
    ["b", [
      cell("b", "000300", "d1", "wQ", { wQ: 0.4, wK: 0.51 }),
      cell("b", "000300", "e1", "wR", { wR: 0.5, wQ: 0.3, wK: 0.2 }),
    ]],
  ] as [string, string[]][]) {
    await mkdir(path.join(root, "recordings", game), { recursive: true });
    await writeFile(path.join(root, "recordings", game, "model-reads.jsonl"), lines.join("\n") + "\n", "utf8");
  }
}

test("the query spans every live session and answers with keys, reads and what ⏎ agrees to", async () => {
  await corpus();
  const answer = await queryCorpus({ klass: DISAGREE, min: 0.5 });
  expect(answer.cells).toBe(3);
  expect(answer.hits.map((h) => `${h.session}/${h.stem}`)).toEqual([
    "rg-a/000100", "rg-a/000200", "rg-b/000300",
  ]);
  expect(answer.hits[0]).toEqual({
    session: "rg-a", stem: "000100", squares: ["a1"], reads: { a1: "wQ 0.70" }, accept: { a1: "wQ" },
  });
  // Only the classes the model actually emitted, so no dead option reaches the select.
  expect(answer.classes).toEqual(["wB", "wK", "wN", "wQ", "wR"]);
  expect(answer.filter).toEqual({ klass: DISAGREE, min: 0.5 });

  const wq = await queryCorpus({ klass: "wQ", min: 0.5 });
  expect(wq.cells).toBe(2); // a1 and c1 — d1's FEN already says wQ, which is no wall
  expect(wq.hits.flatMap((h) => h.squares)).toEqual(["a1", "c1"]);
  // The read ANSWERS the question asked, so the card's word and its accept can never diverge.
  expect(wq.hits[1].reads).toEqual({ c1: "wQ 0.55" });
  expect(wq.hits[1].accept).toEqual({ c1: "wQ" });

  // Below the argmax band a class query is WIDER than `Modell ≠ FEN`: e1 reads wQ 0.30 under a
  // top read that agrees with the FEN, so only the class question can reach it.
  expect((await queryCorpus({ klass: "wQ", min: 0.25 })).cells).toBe(3);
  expect((await queryCorpus({ klass: DISAGREE, min: 0.25 })).cells).toBe(3);
  // A class the FEN already says is no wall, however sure the model is of it.
  expect((await queryCorpus({ klass: "wB", min: 0.25 })).cells).toBe(0);
  expect((await queryCorpus({ klass: "wN", min: 0.9 })).cells).toBe(0);
});

// `loadSession(name).catch(() => null)` schaltete bei unlesbarem Log den Phasenfilter ab, meldete ihn aber weiter.
test("a recording whose log cannot be read does not silently skip the phase filter", async () => {
  const root = await tempDataRoot("phase");
  await mkdir(path.join(root, "recordings", "a"), { recursive: true });
  await writeFile(path.join(root, "recordings", "a", "model-reads.jsonl"),
    cell("a", "000100", "a1", "wR", { wR: 0.2, wQ: 0.7 }) + "\n", "utf8");
  const answer = await queryCorpus({ klass: DISAGREE, min: 0.5 }, "settled");
  expect(answer.cells, "BUG: an unreadable log turns the phase restriction off").toBe(0);
});
