import { mkdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { readJsonl } from "@/lib/jsonl";
import type { CorpusIndex, Split } from "@/lib/corpus";
import { dedupCorrections, squareLabels, foldPool, loadPool, occludedDiff, occludedFit, snapshotOccluded } from "@/lib/pool";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: "stat" | "readdir", file: string, rest: unknown[]) => {
    try {
      fail.on?.(file);
    } catch (error) {
      return Promise.reject(error);
    }
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (file.includes(needle)) throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

function freshPool() {
  delete (globalThis as { __chesslabPool?: unknown }).__chesslabPool;
  return loadPool();
}

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

// H2 (2026-09-22): `/corpus` zeichnet den Pool als Messung; ein `readdir`/`stat`-Fehler nahm Aufnahmen lautlos heraus.
test("ein I/O-Fehler auf log.jsonl ist keine Aufnahme ohne Zellen", async () => {
  await writeSession({ root: await tempDataRoot("poolstat"), rows: [{ frame: 234 }, { frame: 237 }] });
  blowUpOn("log.jsonl", "EMFILE");
  await expect(freshPool()).rejects.toThrow(/EMFILE/);
});

test("ein I/O-Fehler auf dem Aufnahme-Verzeichnis ist kein leerer Korpus", async () => {
  await writeSession({ root: await tempDataRoot("poolreaddir"), rows: [{ frame: 234 }] });
  blowUpOn("recordings", "EACCES");
  await expect(freshPool()).rejects.toThrow(/EACCES/);
});

test("und eine fehlende Aufnahme bleibt ein leerer Korpus, ohne Fehler", async () => {
  await tempDataRoot("poolleer");
  const pool = await freshPool();
  expect(pool.cells).toBe(0);
  expect(pool.frames).toBe(0);
});

test("der gesunde Fall zaehlt weiter 64 Zellen je Frame", async () => {
  await writeSession({ root: await tempDataRoot("poolok"), rows: [{ frame: 234 }, { frame: 237 }] });
  const pool = await freshPool();
  expect(pool.frames).toBe(2);
  expect(pool.cells).toBe(128);
});

// 2026-09-17: ein gefangener Lesefehler am Nachbarn `corrections.jsonl` zeigte die Urteile als nie gefaellt, gecacht.
test("ein unlesbares corrections.jsonl ist kein Pool ohne Korrekturen", async () => {
  const dir = await writeSession({ root: await tempDataRoot("poolfail"), rows: [{ frame: 234 }] });
  await mkdir(path.join(dir, "corrections.jsonl"), { recursive: true });
  await expect(freshPool()).rejects.toThrow();
});
