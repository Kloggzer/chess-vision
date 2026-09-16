import { readJsonl } from "@/lib/jsonl";
import { expect, test } from "vitest";
import type { CorpusIndex, Split } from "@/lib/corpus";
import { dedupCorrections, squareLabels, foldPool, occludedDiff, occludedFit, snapshotOccluded } from "@/lib/pool";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** One session, two frames — the smallest thing that has a pool at all. */
const SESSION = [
  { sessionId: "rg-2026-08-07", frames: [{ stem: "000234", fen: START, dirty: true }, { stem: "000237", fen: START, dirty: false }] },
];

test("a FEN asserts 64 labels and never asserts occluded", () => {
  const labels = squareLabels(START);
  expect(Object.keys(labels)).toHaveLength(64);
  expect(labels.a1).toBe("wR");
  expect(labels.e8).toBe("bK");
  expect(labels.d4).toBe("empty");
  expect(Object.values(labels)).not.toContain("occluded");
});

test("the dedup is last-wins on (session_id, str(frame), square)", () => {
  const last = dedupCorrections(readJsonl(
    '{"session_id":"rg-a","frame":"000234","square":"e2","label":"occluded"}\n'
    + '{"session_id":"rg-a","frame":234,"square":"e2","label":"empty"}\n'
    + '{"session_id":"rg-a","frame":"000234","square":"e2","label":"wP"}\n'
    + "not json at all",
  ));
  // `234` and `"000234"` are DIFFERENT keys — Python stringifies the value, it does not renumber it.
  expect(last.get("rg-a|000234|e2")).toBe("wP");
  expect(last.get("rg-a|234|e2")).toBe("empty");
  expect(last.size).toBe(2);
});

test("the pool is the FEN with the ledger on top, and counts cells, not crops", () => {
  const pool = foldPool(
    SESSION,
    dedupCorrections(readJsonl(
      '{"session_id":"rg-2026-08-07","frame":"000234","square":"e2","label":"occluded"}\n'
      + '{"session_id":"rg-2026-08-07","frame":"000234","square":"e4","label":"occluded"}\n'
      + '{"session_id":"rg-fremd","frame":"000001","square":"a1","label":"occluded"}\n',
    )),
  );
  expect(pool.frames).toBe(2);
  expect(pool.cells).toBe(128);
  expect(pool.classes.occluded).toBe(2);
  // e2 was a wP in the FEN and is now occluded; e4 was empty. 8 pawns on one frame, 7 on the other.
  expect(pool.classes.wP).toBe(15);
  expect(pool.occludedBySession["rg-2026-08-07"]).toBe(2);
  // A correction on a frame no exported log carries has no snapshot to land in.
  expect(pool.orphans).toBe(1);
});

const INDEX: CorpusIndex = {
  dataset: "d",
  key: "k",
  rows: 3,
  coverage: null,
  written_at: "",
  sessions: {
    "occ-rg-2026-08-07": { total: 2120, classes: { occluded: 2120 } },
    "rg-2026-08-08": { total: 7917, classes: { empty: 7917 } },
  },
};
const SPLIT = { splits: { train: ["occ-rg-2026-08-07", "rg-2026-08-08"] } } as unknown as Split;

test("a session sits in the snapshot only if its OCCLUDED crops do", () => {
  const snapshot = snapshotOccluded(INDEX, SPLIT);
  expect(snapshot.total).toBe(2120);

  const pool = { classes: {}, occludedBySession: { "rg-2026-08-07": 2251, "rg-2026-08-08": 4027, "rg-2026-08-13": 0 }, frames: 0, cells: 0, orphans: 0 };
  const fit = occludedFit(pool, snapshot);
  // `rg-2026-08-08` IS in the dataset — but without a single occluded crop, so it is not "drin".
  expect(fit.inside).toEqual([{ sessionId: "rg-2026-08-07", datasetSessionId: "occ-rg-2026-08-07", crops: 2120 }]);
  expect(fit.outside).toEqual(["rg-2026-08-08"]);
});

test("DIFF is pool minus snapshot — positive is what a rebuild would add", () => {
  expect(occludedDiff(15616, 3901)).toBe(11715);
  expect(occludedDiff(3901, 3901)).toBe(0);
  expect(occludedDiff(100, 300)).toBe(-200);
});
