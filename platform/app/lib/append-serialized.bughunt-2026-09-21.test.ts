/**
 * `appendRows` ist lesen, ggf. den halben Schwanz per KOMPLETT-Ersatz abschneiden, anhaengen —
 * zwei Schreibvorgaenge. Ohne Riegel lesen zwei Anfragen denselben Schwanz, die erste repariert
 * und haengt ihr Urteil an, die zweite ersetzt die Datei danach aus ihrem aelteren Lesestand.
 * `corrections.jsonl` und `reviewed.jsonl` sind Handarbeit — das darf dort nicht passieren.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { appendRows } from "@/lib/atomic";
import { appendCorrections, correctionsPath } from "@/lib/corrections";
import { jsonlRows } from "@/lib/jsonl";
import { serialize } from "@/lib/serialize";
import { tempDataRoot } from "@/lib/test-fixtures";

/** Ein abgerissener Schwanz, wie das Handy und ein abgebrochener Lauf ihn hinterlassen. */
const TORN = '{"session_id":"rg-g","frame":"000010","square":"a1","label":"wP","ts":"x"}\n{"half';

async function recording(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "recordings", "g");
  await mkdir(dir, { recursive: true });
  return dir;
}

const MANY = 24;

test("gleichzeitige appendRows auf einen abgerissenen Schwanz verlieren keine Zeile", async () => {
  const dir = await recording("append-race");
  const file = path.join(dir, "probe.jsonl");
  await writeFile(file, TORN, "utf8");
  const all = Array.from({ length: MANY }, (_, n) => appendRows(file, [{ n }]));
  await Promise.all(all);
  const seen = jsonlRows(await readFile(file, "utf8")).map((r) => r.n).filter((n) => typeof n === "number");
  expect([...seen].sort((a, b) => (a as number) - (b as number))).toEqual([...Array(MANY).keys()]);
});

test("dasselbe ueber das Korrektur-Ledger — das ist die Datei, die es wirklich trifft", async () => {
  await recording("append-corrections");
  const file = correctionsPath("g");
  await writeFile(file, TORN, "utf8");
  const squares = Array.from({ length: MANY }, (_, i) => `sq${i}`);
  await Promise.all(
    squares.map((square) =>
      appendCorrections([{ session_id: "rg-g", frame: "000020", square, label: "wN" }]),
    ),
  );
  const written = new Set(jsonlRows(await readFile(file, "utf8")).map((r) => r.square));
  expect(squares.filter((s) => !written.has(s))).toEqual([]);
});

/** Der Riegel sitzt im TREUHAENDER, und `serialize` ist NICHT wiedereintrittsfaehig: wer aussen
 *  auf denselben Pfad riegelt, verklemmt sich. Festgehalten, damit es niemand neu herausfindet. */
test("verschachteltes serialize auf demselben Schluessel verklemmt", async () => {
  const file = path.join(await recording("append-nested"), "nested.jsonl");
  const nested = serialize(file, () => appendRows(file, [{ n: 1 }]));
  const raced = await Promise.race([nested, new Promise((r) => setTimeout(() => r("verklemmt"), 200))]);
  expect(raced).toBe("verklemmt");
});

/** Genau die Stelle, die den Riegel abgeben musste — kommt er zurueck, haengt `appendReviewNotes`. */
test("appendReviewNotes riegelt nicht noch einmal selbst", async () => {
  const source = await readFile(path.join(process.cwd(), "lib", "review-notes.ts"), "utf8");
  const body = source.slice(source.indexOf("export async function appendReviewNotes"), source.indexOf("export async function dropReviewNotes"));
  expect(body).toContain("appendRows(file");
  expect(body).not.toContain("serialize(");
});
