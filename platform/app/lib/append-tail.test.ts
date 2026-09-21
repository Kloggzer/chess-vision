/**
 * Rohes `appendFile` an eine `.jsonl` mit halber letzter Zeile klebt die neue Zeile daran — aus
 * dem tolerierten Schwanz wird Korruption MITTENDRIN, auf die `lib/jsonl.ts` danach fuer immer
 * wirft. `appendRows` schneidet den Schwanz vorher ab (wie `ioutil.append_rows`).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { appendRows } from "@/lib/atomic";
import { appendCorrections } from "@/lib/corrections";
import { appendUnusableCells } from "@/lib/unusable-cells";
import { readJsonl } from "@/lib/jsonl";
import { tempDataRoot } from "@/lib/test-fixtures";

const WHOLE = '{"session_id":"rg-rec-1","frame":"000001","square":"a1","label":"wP","ts":"2026-08-01T00:00:00+00:00"}\n';
/** Der Schreiber wurde mitten in der Zeile erschlagen: kein Umbruch dahinter. */
const HALF = '{"session_id":"rg-rec-1","frame":"000002","squar';

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("append-tail");
  await mkdir(path.join(root, "recordings", "rec-1"), { recursive: true });
});

test("Korrekturen anhaengen macht aus dem Schwanz keine Korruption", async () => {
  const file = path.join(root, "recordings", "rec-1", "corrections.jsonl");
  await writeFile(file, WHOLE + HALF, "utf8");

  await appendCorrections([{ session_id: "rg-rec-1", frame: "000003", square: "b2", label: "wQ" }]);

  const got = readJsonl(await readFile(file, "utf8"));
  expect(got.corrupt, "die halbe Zeile wurde ueberklebt statt abgeschnitten").toBe(0);
  expect(got.rows.map((r) => r.square)).toEqual(["a1", "b2"]);
});

test("unbrauchbare Zellen anhaengen macht aus dem Schwanz keine Korruption", async () => {
  const file = path.join(root, "recordings", "rec-1", "unusable-cells.jsonl");
  await writeFile(file, WHOLE + HALF, "utf8");

  await appendUnusableCells([{ session_id: "rg-rec-1", frame: "000003", square: "b2", unusable: true }]);

  expect(readJsonl(await readFile(file, "utf8")).corrupt).toBe(0);
});

test("CRLF: das halbe \\r bekommt seinen Umbruch, die Zeile bleibt", async () => {
  const file = path.join(root, "recordings", "rec-1", "crlf.jsonl");
  await writeFile(file, '{"a":1}\r\n{"b":2}\r', "utf8");

  await appendRows(file, [{ c: 3 }]);

  const got = readJsonl(await readFile(file, "utf8"));
  expect([got.corrupt, got.tail]).toEqual([0, false]);
  expect(got.rows, "die ganze Zeile vor dem halben CRLF flog weg").toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
});

test("eine ganze Datei bleibt unangetastet, eine fehlende entsteht", async () => {
  const file = path.join(root, "recordings", "rec-1", "fresh.jsonl");
  expect(await appendRows(file, [{ a: 1 }])).toBe(1);
  await appendRows(file, [{ b: 2 }, { c: 3 }]);

  expect(readJsonl(await readFile(file, "utf8")).rows).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
});
