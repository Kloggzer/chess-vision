import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { boardProgress, boardProgressOf, loadModelReads, readCensus } from "@/lib/model-reads";
import { acceptLabel, DISAGREE, matches } from "@/lib/query";
import { gemessen, tempDataRoot } from "@/lib/test-fixtures";

/** The producer's own shape (`occluded_model.read_session`), header line included. */
const LINES = [
  '{"_model": "data/models/d16-f0", "_classes": ["empty", "wP", "wR"], "_written_at": "2026-08-18T22:22:47+00:00"}',
  '{"session_id": "rg-g", "frame": "000100", "square": "a1", "fen_label": "wR", "dirty_reason": "occluded", "probs": {"wR": 0.998}}',
  '{"session_id": "rg-g", "frame": "000100", "square": "a2", "fen_label": "wP", "dirty_reason": "occluded", "probs": {"empty": 0.7, "wP": 0.3}}',
  '{"session_id": "rg-g", "frame": "000200", "square": "a1", "fen_label": "wR", "dirty_reason": null, "probs": {"wR": 1.0}}',
];

async function withFile(lines: string[], name = "g") {
  const root = await tempDataRoot("model-reads");
  const dir = path.join(root, "recordings", name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "model-reads.jsonl"), lines.join("\n") + "\n", "utf8");
  return dir;
}

test("header and rows, in the producer's order", async () => {
  await withFile(LINES);
  const { rows, header } = gemessen(await loadModelReads("g"));
  expect(header).toEqual({
    model: "data/models/d16-f0",
    classes: ["empty", "wP", "wR"],
    writtenAt: "2026-08-18T22:22:47+00:00",
  });
  expect(rows.map((r) => `${r.frame}|${r.square}`)).toEqual(["000100|a1", "000100|a2", "000200|a1"]);
  // Clean boards are in the file too — the old proposer only ever read the dirty pile.
  expect(rows[2].dirty_reason).toBeNull();
});

test("no file is NOT MEASURED, and every count says so instead of claiming zero", async () => {
  const root = await tempDataRoot("model-reads");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  expect(await loadModelReads("g")).toEqual({ measured: false });
  expect(await readCensus("g")).toMatchObject({ present: false, boards: 0, cells: 0, model: null });
});

test("a file whose header was never written still yields its rows", async () => {
  await withFile(LINES.slice(1));
  const { rows, header } = gemessen(await loadModelReads("g"));
  expect(rows).toHaveLength(3);
  expect(header).toEqual({ model: null, classes: [], writtenAt: null });
});

test("the census counts BOARDS as distinct frames, and names the run that read them", async () => {
  await withFile(LINES);
  expect(await readCensus("g")).toEqual({
    boards: 2,
    cells: 3,
    frames: ["000100", "000200"],
    model: "data/models/d16-f0",
    writtenAt: "2026-08-18T22:22:47+00:00",
    present: true,
  });
});

test("the cache is mtime-keyed: an unchanged file is not re-read, a rewritten one is", async () => {
  const dir = await withFile(LINES);
  const first = await loadModelReads("g");
  expect(await loadModelReads("g")).toBe(first); // same object — nothing was parsed again

  await writeFile(
    path.join(dir, "model-reads.jsonl"),
    LINES.concat('{"session_id": "rg-g", "frame": "000300", "square": "b2", "fen_label": "empty", "probs": {"empty": 0.9}}')
      .join("\n") + "\n",
    "utf8",
  );
  expect((await readCensus("g")).boards).toBe(3);
});

test("the board denominator is |touched ∩ read| / |read|", async () => {
  await withFile(LINES);
  const { boards, done } = await boardProgressOf("g", ["000100|a1", "000100|a2", "009999|a1"]);
  // Twelve cells on one board are one board of work; a frame no model read is another corpus.
  expect({ boards, done }).toEqual({ boards: 2, done: 1 });
  expect(boardProgress(["000100", "000200"], ["000100|a1", "000200|h8"])).toEqual({ boards: 2, done: 2 });
});

test("a cell the model never read answers no query, and occluded stays unwritable", () => {
  const bare = { session_id: "s", frame: "1", square: "g3", fen_label: "empty" };
  expect(matches(bare, { klass: "wP", min: 0.5 })).toBe(false);
  expect(acceptLabel(bare, { klass: DISAGREE, min: 0.3 })).toBeNull();
  // `occluded` is measured (matte.jsonl coverage) and `validate` rejects it — whatever mass a
  // 14-class run put there, agreeing with it must never write the word.
  const occ = { ...bare, square: "e4", probs: { wP: 0.55, occluded: 0.4 } };
  expect(acceptLabel(occ, { klass: "occluded", min: 0.3 })).toBeNull();
  expect(acceptLabel(occ, { klass: DISAGREE, min: 0.3 })).toBe("wP");
});
