/**
 * Die Naht zwischen `lib/measurement.ts` und der Lane: `measured: false` wird zu `null`, und die
 * Lane rendert daraus `—`. Genau hier schrieb `loadLabelStream` bis 2026-09-21
 * `loadModelReads(name).catch(() => ({ rows: [] }))` und machte aus jedem Lesefehler eine leere
 * Messung — die Naht darueber macht auf, was der Leser darunter richtig macht.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { dataDir, gameDir } from "@/lib/data";
import { loadLabelStream } from "@/lib/label-stream";
import { NO_AUDIT, NO_HAND, NO_POSITION, laneCount } from "@/lib/lanes";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const NAME = "2026-08-19-12-00-00";
const ID = `rg-${NAME}`;
const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function fixture(): Promise<string> {
  const root = await tempDataRoot("seam");
  await writeSession({ root, name: NAME, rows: [{ frame: 0, fen: FEN }, { frame: 1, fen: FEN }] });
  return root;
}

const report = async (file: string, text: string) => {
  await mkdir(path.join(dataDir(), "reports"), { recursive: true });
  await writeFile(path.join(dataDir(), "reports", file), text, "utf8");
};

test("kein Bericht heisst `null`, nicht die leere Liste — die Lane sagt es dann auch", async () => {
  await fixture();

  const stream = await loadLabelStream();

  expect([stream.audit, stream.hands, stream.positions]).toEqual([null, null, null]);
  expect(stream.positionsUnmeasured).toEqual([]);
  expect(stream.handScanned).toEqual([false]);
  // Alle drei Quellen schweigen: die Lane zaehlt `null` und nennt jede beim Namen.
  const { n, why } = laneCount(stream, "audit");
  expect(n).toBeNull();
  for (const grund of [NO_AUDIT, NO_POSITION, NO_HAND]) expect(why).toContain(grund);
});

test("ein Bericht mit null Treffern ist eine Messung: die Lane zaehlt 0 statt `—`", async () => {
  await fixture();
  await report("position-flags.jsonl", '{"_settle_limit": 45.0, "_unmeasured": ["rg-x"]}\n');

  const stream = await loadLabelStream();

  expect(stream.positions).toEqual([]);
  expect(stream.positionsUnmeasured).toEqual(["rg-x"]);
});

test("ein Bericht mit einer Zeile landet auf dem Brett, das ihn traegt", async () => {
  await fixture();
  await report("position-flags.jsonl",
    `{"session_id": "${ID}", "frame": "000000", "square": "e2", "fen_label": "wP", ` +
    '"dev": 41.2, "matte_cov": null, "reason": "changed"}\n');

  const stream = await loadLabelStream();

  expect(stream.positions).toHaveLength(1);
  expect(stream.positions?.[0]).toMatchObject({ session: 0, stem: "000000", square: "e2", dev: 41.2 });
});

test("ein unlesbarer Bericht ist keine leere Lane, sondern ein Fehler", async () => {
  await fixture();
  // Ein Verzeichnis an der Stelle der Datei: `stat` gelingt, `readFile` wirft EISDIR.
  await mkdir(path.join(dataDir(), "reports", "hand-flags.jsonl"), { recursive: true });

  await expect(loadLabelStream()).rejects.toThrow();
});

test("ein unlesbares `model-reads.jsonl` faellt nicht mehr als `rows: []` durch die Naht", async () => {
  await fixture();
  await mkdir(path.join(gameDir(NAME), "model-reads.jsonl"), { recursive: true });

  await expect(loadLabelStream()).rejects.toThrow();
});
