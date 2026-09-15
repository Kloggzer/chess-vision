import { mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { classScheme, corpusIndex, corpusIndexDir, datasetDir, INDEX_VERSION, isRealGame, loadDatasetMeta, sameSession, tallyLines, trainShares, type Split } from "@/lib/corpus";
import { tempDataRoot } from "@/lib/test-fixtures";

/** Two sessions, one of them a real game under its `occ-` alias — the shape §7.2 groups by. */
const MANIFEST = [
  '{"path":"mm://t/000000/a1","session_id":"train80-VID_1","square":"a1","label":"wR"}',
  '{"path":"mm://t/000000/b1","session_id":"train80-VID_1","square":"b1","label":"empty"}',
  '{"path":"mm://o/000000/a1","session_id":"occ-rg-2026-08-07","square":"a1","label":"occluded"}',
  "",
  "{ this line is half written",
].join("\n");

const SPLIT: Split = {
  classes: ["empty", "wR", "occluded"],
  class_weights: { empty: 0.14, wR: 2.3, occluded: 3.8 },
  counts: { train: 3, val: 0, test: 0 },
  train_class_counts: { empty: 1, wR: 1, occluded: 1 },
  warnings: [],
  splits: { train: ["train80-VID_1", "occ-rg-2026-08-07"], val: [], test: [] },
};

let manifest: string;

/** The memo is pinned to `globalThis` on purpose — every test has to start from an empty one. */
const clearMemo = () => (globalThis as { __chesslabCorpusIndex?: Map<string, unknown> }).__chesslabCorpusIndex?.clear();

beforeEach(async () => {
  await tempDataRoot("corpus");
  clearMemo();
  await mkdir(datasetDir("d1"), { recursive: true });
  manifest = path.join(datasetDir("d1"), "manifest.jsonl");
  await writeFile(manifest, MANIFEST + "\n", "utf8");
});

test("the group-by counts per session and per class and survives a broken line", async () => {
  const tally = await tallyLines(MANIFEST.split("\n"));
  expect(tally.rows).toBe(3);
  expect(tally.sessions["train80-VID_1"]).toEqual({ total: 2, classes: { wR: 1, empty: 1 } });
  expect(tally.sessions["occ-rg-2026-08-07"].classes.occluded).toBe(1);
});

test("the index lands OUTSIDE the dataset and is keyed by the manifest's mtime", async () => {
  const first = await corpusIndex("d1");
  expect(first.rows).toBe(3);

  const file = path.join(corpusIndexDir(), "d1.json");
  const onDisk = JSON.parse(await readFile(file, "utf8"));
  expect(onDisk.key).toBe(first.key);
  // Datasets are snapshots: nothing this app writes may land in one.
  await expect(stat(path.join(datasetDir("d1"), "corpus-index.json"))).rejects.toThrow();

  // A rewritten manifest invalidates the index even when the cached one is still readable.
  await writeFile(manifest, MANIFEST + '\n{"session_id":"rg-neu","label":"empty"}\n', "utf8");
  const later = new Date(Date.now() + 60_000);
  await utimes(manifest, later, later);
  const second = await corpusIndex("d1");
  expect(second.key).not.toBe(first.key);
  expect(second.rows).toBe(4);
  expect(second.sessions["rg-neu"].total).toBe(1);
});

test("an unchanged manifest is answered from the index file, not from a second pass", async () => {
  const first = await corpusIndex("d1");
  // Overwrite the cached counts with a value no manifest pass could produce: a hit must return it.
  await writeFile(path.join(corpusIndexDir(), "d1.json"), JSON.stringify({ ...first, rows: 999 }), "utf8");
  clearMemo();
  expect((await corpusIndex("d1")).rows).toBe(999);
});

test("shares are of the train split alone, and the real games are summed apart", () => {
  const shares = trainShares(
    { dataset: "d1", key: "k", rows: 3, coverage: null, written_at: "", sessions: { "train80-VID_1": { total: 90, classes: {} }, "occ-rg-2026-08-07": { total: 10, classes: {} }, "test80-x": { total: 500, classes: {} } } },
    SPLIT,
  );
  expect(shares.total).toBe(100);
  expect(shares.rows.map((row) => row.sessionId)).toEqual(["train80-VID_1", "occ-rg-2026-08-07"]);
  expect(shares.rows[1].share).toBeCloseTo(0.1);
  expect(shares.real).toBe(10);
  expect(shares.realShare).toBeCloseTo(0.1);
});

test("a snapshot's scheme comes from the snapshot, never from a default", async () => {
  const thirteen: Split = { ...SPLIT, classes: ["empty", "wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"] };
  expect(classScheme(SPLIT, { classMode: "pieces14" })).toBe("pieces14");
  expect(classScheme(SPLIT, { classMode: "pieces13" })).toBe("pieces13"); // the file's word outranks the list
  expect(classScheme({ ...SPLIT, classes: ["empty", "occupied"] }, { classMode: "occupancy" })).toBe("other");
  // Four packs on disk say the older `class_mode: pieces` and carry 14 classes — the list decides.
  expect(classScheme(SPLIT, { classMode: "pieces" })).toBe("pieces14");
  expect(classScheme(thirteen, { classMode: "pieces" })).toBe("pieces13");
  // No `dataset.yaml`: the class list is the same evidence one step later.
  expect(classScheme(SPLIT, { classMode: null })).toBe("pieces14");
  expect(classScheme(thirteen, { classMode: null })).toBe("pieces13");
  expect(classScheme({ ...SPLIT, classes: ["empty", "occupied"] }, { classMode: null })).toBe("other");
  expect(await loadDatasetMeta("d1")).toEqual({ classMode: null });
  await writeFile(path.join(datasetDir("d1"), "dataset.yaml"), "name: d1\nclass_mode: pieces13\n", "utf8");
  expect(await loadDatasetMeta("d1")).toEqual({ classMode: "pieces13" });
});

test("coverage is counted where the rows carry it, and stays null where they do not", async () => {
  const bare = await tallyLines(MANIFEST.split("\n"));
  expect(bare.coverage).toBeNull();
  const measured = await tallyLines([
    '{"session_id":"rg-a","label":"wP","coverage":0.0}',
    '{"session_id":"rg-a","label":"wP","coverage":0.15}',
    '{"session_id":"rg-a","label":"wP","coverage":0.94}',
  ]);
  expect(measured.coverage).toEqual({ rows: 3, over: 1 });
});

test("an index written by an older pass is rebuilt, not read as if it counted coverage", async () => {
  const first = await corpusIndex("d1");
  expect(first.version).toBe(INDEX_VERSION);
  await writeFile(
    path.join(corpusIndexDir(), "d1.json"),
    JSON.stringify({ ...first, version: undefined, rows: 999 }),
    "utf8",
  );
  clearMemo();
  expect((await corpusIndex("d1")).rows).toBe(3);
});

test("a variant prefix is not a different session", () => {
  expect(sameSession("occ-rg-2026-08-07", "rg-2026-08-07")).toBe(true);
  expect(sameSession("rg-2026-08-07", "rg-2026-08-07")).toBe(true);
  expect(sameSession("rg-2026-08-07-13-52-38", "rg-2026-08-07")).toBe(false);
  expect(isRealGame("phone-20260808-220912")).toBe(false);
  expect(isRealGame("occ-rg-2026-08-07")).toBe(true);
});
