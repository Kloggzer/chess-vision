/**
 * Review 2026-09-17 (nicht gebaut, nur gefunden): `dropReviewNotes` schreibt die GLOBALE
 * `review-notes.jsonl` neu und behaelt eine unparsbare Zeile absichtlich — aber es haengt
 * `\n` dahinter. Aus dem tolerierten SCHWANZ eines laufenden Anhaengens wird damit Korruption
 * MITTENDRIN, und `bySession` wirft seit heute darauf, statt sie zu ueberspringen: jedes
 * menschliche Urteil aller Sitzungen ist danach unerreichbar, bis jemand die Datei repariert.
 * Dieselbe Fehlerklasse, gegen die `appendRows` gebaut wurde — eine Funktion weiter oben.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { readJsonl } from "@/lib/jsonl";
import { tempDataRoot } from "@/lib/test-fixtures";

const row = (frame: string) =>
  JSON.stringify({ session_id: "rg-a", frame, verdict: "unusable-board", ts: "2026-09-17T00:00:00+00:00" });
/** Der Schreiber steckt mitten in der Zeile: kein Umbruch dahinter. */
const HALF = '{"session_id":"rg-a","frame":"000003","verd';

test("ein Widerruf macht aus dem halben Schwanz keine Korruption mittendrin", async () => {
  const root = await tempDataRoot("drop-tail");
  await mkdir(path.join(root, "labels"), { recursive: true });
  const file = path.join(root, "labels", "review-notes.jsonl");
  await writeFile(file, `${row("000001")}\n${row("000002")}\n${HALF}`, "utf8");

  const { dropReviewNotes } = await import("@/lib/review-notes");
  await dropReviewNotes([{ session_id: "rg-a", frame: "000001", verdict: "unusable-board" }]);

  const got = readJsonl(await readFile(file, "utf8"));
  expect(got.corrupt, "die halbe Zeile wurde mit \n abgeschlossen statt abgeschnitten").toBe(0);
  expect(got.rows.map((r) => r.frame)).toEqual(["000002"]);
});

test("und danach ist das Ledger fuer JEDE Sitzung unlesbar, nicht nur fuer die betroffene", async () => {
  const root = await tempDataRoot("drop-tail-throws");
  await mkdir(path.join(root, "labels"), { recursive: true });
  const file = path.join(root, "labels", "review-notes.jsonl");
  await writeFile(file, `${row("000001")}\n${row("000002")}\n${HALF}`, "utf8");

  const { dropReviewNotes, unusableBoards } = await import("@/lib/review-notes");
  (globalThis as { __chesslabReviewNotes?: Map<string, unknown> }).__chesslabReviewNotes?.clear();
  await dropReviewNotes([{ session_id: "rg-a", frame: "000001", verdict: "unusable-board" }]);
  (globalThis as { __chesslabReviewNotes?: Map<string, unknown> }).__chesslabReviewNotes?.clear();

  await expect(unusableBoards("rg-b")).resolves.toEqual(new Set());
});

/**
 * Die zweite Haelfte: den Schwanz ABZUSCHNEIDEN vermeidet die Korruption auch — und verliert
 * dabei die Zeile, die der andere Schreiber gerade schreibt. Ohne diese Zusage haelt der Fix
 * gegen die eine Falle und faellt in die andere.
 */
test("der halbe Schwanz ueberlebt den Widerruf, er wird nicht weggeworfen", async () => {
  const root = await tempDataRoot("drop-tail-keeps");
  await mkdir(path.join(root, "labels"), { recursive: true });
  const file = path.join(root, "labels", "review-notes.jsonl");
  await writeFile(file, `${row("000001")}\n${row("000002")}\n${HALF}`, "utf8");

  const { dropReviewNotes } = await import("@/lib/review-notes");
  await dropReviewNotes([{ session_id: "rg-a", frame: "000001", verdict: "unusable-board" }]);

  const text = await readFile(file, "utf8");
  expect(text.endsWith(HALF), "der laufende Schreiber haengt an genau diese halbe Zeile an").toBe(true);
  expect(readJsonl(text).tail, "und sie gilt weiter als Schwanz, nicht als Zeile").toBe(true);
});
