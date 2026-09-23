/**
 * Rohes `appendFile` an eine `.jsonl` mit halber letzter Zeile klebt die neue Zeile daran — aus
 * dem tolerierten Schwanz wird Korruption MITTENDRIN. `appendRows` schneidet vorher ab.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { appendRows } from "@/lib/atomic";
import { appendCorrections, correctionsPath } from "@/lib/session-store/corrections";
import { appendUnusableCells } from "@/lib/session-store/unusable-cells";
import { jsonlRows, readJsonl } from "@/lib/jsonl";
import { serialize } from "@/lib/serialize";
import { tempDataRoot } from "@/lib/test-fixtures";

const WHOLE = '{"session_id":"rg-rec-1","frame":"000001","square":"a1","label":"wP","ts":"2026-08-01T00:00:00+00:00"}\n';
const HALF = '{"session_id":"rg-rec-1","frame":"000002","squar';

let dir: string;

beforeEach(async () => {
  dir = path.join(await tempDataRoot("append-tail"), "recordings", "rec-1");
  await mkdir(dir, { recursive: true });
});

test("Korrekturen anhaengen macht aus dem Schwanz keine Korruption", async () => {
  const file = path.join(dir, "corrections.jsonl");
  await writeFile(file, WHOLE + HALF, "utf8");

  await appendCorrections([{ session_id: "rg-rec-1", frame: "000003", square: "b2", label: "wQ" }]);

  const got = readJsonl(await readFile(file, "utf8"));
  expect(got.corrupt, "die halbe Zeile wurde ueberklebt statt abgeschnitten").toBe(0);
  expect(got.rows.map((r) => r.square)).toEqual(["a1", "b2"]);
});

test("unbrauchbare Zellen anhaengen macht aus dem Schwanz keine Korruption", async () => {
  const file = path.join(dir, "unusable-cells.jsonl");
  await writeFile(file, WHOLE + HALF, "utf8");

  await appendUnusableCells([{ session_id: "rg-rec-1", frame: "000003", square: "b2", unusable: true }]);

  expect(readJsonl(await readFile(file, "utf8")).corrupt).toBe(0);
});

test("eine ganze Datei bleibt unangetastet, eine fehlende entsteht", async () => {
  const file = path.join(dir, "fresh.jsonl");
  expect(await appendRows(file, [{ a: 1 }])).toBe(1);
  await appendRows(file, [{ b: 2 }, { c: 3 }]);

  expect(readJsonl(await readFile(file, "utf8")).rows).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
});

// 2026-09-21: ohne Riegel ersetzte die zweite Anfrage die reparierte Datei aus ihrem aelteren Lesestand.
const MANY = 24;

test("gleichzeitige appendRows auf einen abgerissenen Schwanz verlieren keine Zeile", async () => {
  const file = path.join(dir, "probe.jsonl");
  await writeFile(file, WHOLE + HALF, "utf8");
  await Promise.all(Array.from({ length: MANY }, (_, n) => appendRows(file, [{ n }])));
  const seen = jsonlRows(await readFile(file, "utf8")).map((r) => r.n).filter((n) => typeof n === "number");
  expect([...seen].sort((a, b) => (a as number) - (b as number))).toEqual([...Array(MANY).keys()]);
});

test("dasselbe ueber das Korrektur-Ledger — das ist die Datei, die es wirklich trifft", async () => {
  const file = correctionsPath("rec-1");
  await writeFile(file, WHOLE + HALF, "utf8");
  const squares = Array.from({ length: MANY }, (_, i) => `sq${i}`);
  await Promise.all(
    squares.map((square) =>
      appendCorrections([{ session_id: "rg-rec-1", frame: "000020", square, label: "wN" }]),
    ),
  );
  const written = new Set(jsonlRows(await readFile(file, "utf8")).map((r) => r.square));
  expect(squares.filter((s) => !written.has(s))).toEqual([]);
});

/** `serialize` ist NICHT wiedereintrittsfaehig: wer aussen auf denselben Pfad riegelt, verklemmt sich. */
test("verschachteltes serialize auf demselben Schluessel verklemmt", async () => {
  const file = path.join(dir, "nested.jsonl");
  const nested = serialize(file, () => appendRows(file, [{ n: 1 }]));
  const raced = await Promise.race([nested, new Promise((r) => setTimeout(() => r("verklemmt"), 200))]);
  expect(raced).toBe("verklemmt");
});

test("appendReviewNotes riegelt nicht noch einmal selbst", async () => {
  const source = await readFile(path.join(process.cwd(), "lib", "session-store/review-notes.ts"), "utf8");
  const body = source.slice(source.indexOf("export async function appendReviewNotes"), source.indexOf("export async function dropReviewNotes"));
  expect(body).toContain("appendRows(file");
  expect(body).not.toContain("serialize(");
});
