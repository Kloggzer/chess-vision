/** Zwei Urteile gleichzeitig: `flagFrame` liest die GANZE `log.jsonl`, aendert eine Zeile und
 *  schreibt alles zurueck. Ohne Riegel las der zweite Aufruf den Text VOR dem Schreiben des
 *  ersten — dessen Flag war weg, und beide Wege meldeten Erfolg. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { flagFrame } from "@/lib/frame-flag";
import { jsonlRows } from "@/lib/jsonl";
import { type RowSpec, tempDataRoot, writeSession } from "@/lib/test-fixtures";

const NAME = "2026-09-21-10-00-00";
let dir: string;

const row = (frame: number): RowSpec => ({ frame, dirty: true, extra: { dirty_reason: "stale" } });

beforeEach(async () => {
  const root = await tempDataRoot("frameflag-race");
  dir = await writeSession({ root, name: NAME, fps: 30, rows: [row(100), row(200), row(300)] });
});

test("zwei gleichzeitige Urteile verlieren keines", async () => {
  const both = await Promise.all([
    flagFrame(NAME, "000100", true),
    flagFrame(NAME, "000300", true),
  ]);
  expect(both.map((r) => r.unusable)).toEqual([true, true]);
  const rows = jsonlRows(await readFile(path.join(dir, "log.jsonl"), "utf8"));
  expect(rows.filter((r) => r.unusable === true)).toHaveLength(2);
});
