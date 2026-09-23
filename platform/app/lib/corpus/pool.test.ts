import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import type { CorpusIndex, Split } from "@/lib/corpus/corpus";
import { fenLabels } from "@/lib/fen";
import { loadPool, occludedDiff, occludedFit, snapshotOccluded } from "@/lib/corpus/pool";
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

const freshPool = () => loadPool();

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test("a FEN asserts 64 labels and never asserts occluded", () => {
  const labels = fenLabels(START);
  expect(Object.keys(labels)).toHaveLength(64);
  expect(labels.a1).toBe("wR");
  expect(labels.e8).toBe("bK");
  expect(labels.d4).toBe("empty");
  expect(Object.values(labels)).not.toContain("occluded");
});

/** Eine Aufnahme mit einem Frame je FEN, und ihr Ledger — der Pool rechnet in Python (`corpus_pool`). */
async function poolOf(fens: string[], corrections: (object | string)[] = []) {
  const dir = await writeSession({
    root: await tempDataRoot("pool"), rows: fens.map((fen, i) => ({ frame: 234 + 3 * i, fen })),
  });
  if (corrections.length > 0) {
    await writeFile(path.join(dir, "corrections.jsonl"),
      corrections.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join("\n"), "utf8");
  }
  return freshPool();
}

/** Der Pool zaehlt je Zelle das Label, das Python ueber python-chess vergibt — dieselbe Tabelle
 *  wie `fen-labels-parity.test.ts`, damit Pool und Lanes eine FEN nicht verschieden lesen. */
test("the pool counts every FEN cell exactly as python-chess labels it", async () => {
  const fixture = path.join(__dirname, "../../../../tests/data/fen_labels_parity.json");
  const cases = (JSON.parse(readFileSync(fixture, "utf8")) as { cases: { fen: string; labels: Record<string, string> }[] }).cases;
  for (const c of cases) {
    const pool = await poolOf([c.fen]);
    const want: Record<string, number> = {};
    for (const label of Object.values(c.labels)) want[label] = (want[label] ?? 0) + 1;
    expect(pool.classes, c.fen).toEqual(want);
    expect(pool.cells).toBe(64);
  }
});

test("the dedup is last-wins on (session_id, str(frame), square)", async () => {
  const pool = await poolOf([START], [
    { session_id: "rg-g", frame: "000234", square: "e2", label: "occluded" },
    { session_id: "rg-g", frame: 234, square: "e2", label: "empty" },
    { session_id: "rg-g", frame: "000234", square: "e2", label: "bQ" },
    "not json at all",
  ]);
  // `234` and `"000234"` are DIFFERENT keys — Python stringifies the value, it does not renumber it.
  expect(pool.classes.bQ).toBe(2);
  expect(pool.classes.occluded ?? 0).toBe(0);
  expect(pool.orphans).toBe(1);
});

test("the pool is the FEN with the ledger on top, and counts cells, not crops", async () => {
  const pool = await poolOf([START, START], [
    { session_id: "rg-g", frame: "000234", square: "e2", label: "occluded" },
    { session_id: "rg-g", frame: "000234", square: "e4", label: "occluded" },
    { session_id: "rg-fremd", frame: "000001", square: "a1", label: "occluded" },
  ]);
  expect(pool.frames).toBe(2);
  expect(pool.cells).toBe(128);
  expect(pool.classes.occluded).toBe(2);
  // e2 was a wP in the FEN and is now occluded; e4 was empty. 8 pawns on one frame, 7 on the other.
  expect(pool.classes.wP).toBe(15);
  expect(pool.occludedBySession["rg-g"]).toBe(2);
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

// `/corpus` zeichnet den Pool als Messung; ein `readdir`/`stat`-Fehler nahm Aufnahmen lautlos heraus.
// Den Fall "EMFILE auf log.jsonl" haelt seit 2026-09-23 `tests/test_corpus_pool.py` — Python liest das Log.

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

// Ein gefangener Lesefehler an `corrections.jsonl` zeigte die Urteile als nie gefaellt, gecacht.
test("ein unlesbares corrections.jsonl ist kein Pool ohne Korrekturen", async () => {
  const dir = await writeSession({ root: await tempDataRoot("poolfail"), rows: [{ frame: 234 }] });
  await mkdir(path.join(dir, "corrections.jsonl"), { recursive: true });
  await expect(freshPool()).rejects.toThrow();
});

// `labeling.load_corrections`: eine `retract: true`-Zeile oeffnet die Zelle wieder (CONCEPT.md 4.2.2).
// Die Web-Kopie las sie als Korrektur — der Pool zaehlte zurueckgenommene Urteile weiter mit.
test("ein zurueckgenommenes Urteil zaehlt im Pool nicht mehr", async () => {
  const dir = await writeSession({ root: await tempDataRoot("poolretract"), rows: [{ frame: 234, fen: START }] });
  const row = (extra: object) => JSON.stringify({ session_id: "rg-g", frame: "000234", square: "e2", label: "bQ", ...extra });
  await writeFile(path.join(dir, "corrections.jsonl"), `${row({})}\n${row({ retract: true })}\n`, "utf8");
  const pool = await freshPool();
  expect(pool.classes.bQ ?? 0, "die Ruecknahme hebt die Korrektur auf").toBe(1);
  expect(pool.classes.wP).toBe(8);
});
