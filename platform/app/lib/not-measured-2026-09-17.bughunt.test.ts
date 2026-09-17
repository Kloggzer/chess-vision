/**
 * Bug-Jagd 2026-09-17: "nicht gemessen" wurde als gemessener Normalwert gelesen.
 * Drei Stellen, zwei Klassen — eine Zahl-Erzwingung am Draht und zwei Ledger, die einen
 * Lesefehler als "keine Urteile" ausgaben und die Luege auch noch zwischenspeicherten.
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "not-measured-"));
  vi.doMock("@/lib/data", () => ({
    dataDir: () => dir,
    checkName: (v: string, what: string) => {
      if (!/^[\w.-]+$/.test(v)) throw new Error(`bad ${what}: ${v}`);
    },
  }));
  vi.resetModules();
  (globalThis as { __chesslabReviewNotes?: Map<string, unknown> }).__chesslabReviewNotes?.clear();
});
afterEach(() => vi.doUnmock("@/lib/data"));

const notes = () => import("@/lib/review-notes");

// `app/api/zuege/[name]/note` prueft das seit je; `app/api/review-notes` nimmt DIESELBE Zeile
// ueber `validateNote` an und tat es nicht — der geteilte Tuersteher war der laxere.
test("ein fehlendes `ply` ist kein Urteil ueber Halbzug 0", async () => {
  const { validateNote } = await notes();
  for (const ply of [null, "", true, [], false]) {
    expect(() => validateNote({ session_id: "rg-a", ply, verdict: "bad-interval" }))
      .toThrow(/ply/);
  }
  expect(validateNote({ session_id: "rg-a", ply: 34, verdict: "bad-interval" }))
    .toEqual({ session_id: "rg-a", ply: 34, verdict: "bad-interval" });
  expect(validateNote({ session_id: "rg-a", ply: "34", verdict: "bad-interval" }))
    .toEqual({ session_id: "rg-a", ply: 34, verdict: "bad-interval" });
});

// Ein Lesefehler ist keine Aussage: das Ledger EXISTIERT, nur lesen ging schief. Als "" gelesen
// verschwindet jedes menschliche Urteil und der Cache haelt den Befund bis zur naechsten mtime.
test("ein unlesbares review-notes.jsonl wirft, statt jedes Urteil zu verlieren", async () => {
  const { unusableBoards, badIntervals, reviewNotesPath } = await notes();
  // Ein Verzeichnis an der Stelle der Datei: `stat` gelingt, `readFile` wirft EISDIR.
  await mkdir(reviewNotesPath(), { recursive: true });
  await expect(unusableBoards("rg-a")).rejects.toThrow();
  await expect(badIntervals("rg-a")).rejects.toThrow();
});

test("ein unlesbares unusable-cells.jsonl wirft, statt die Zellen zurueck in die Lane zu holen", async () => {
  const data = await tempDataRoot("unusable-unreadable");
  const NAME = "2026-09-14-11-00-00";
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
  vi.resetModules();
  (globalThis as { __chesslabUnusableCells?: Map<string, unknown> }).__chesslabUnusableCells?.clear();
  vi.doUnmock("@/lib/data");
  const { unusableCells, unusableCellsPath } = await import("@/lib/unusable-cells");
  await mkdir(unusableCellsPath(NAME), { recursive: true });
  await expect(unusableCells(NAME)).rejects.toThrow();
});

test("ein FEHLENDES Ledger bleibt leer — nur der Lesefehler wirft", async () => {
  const { unusableBoards } = await notes();
  expect(await unusableBoards("rg-a")).toEqual(new Set());
  await writeFile(path.join(dir, "x"), "");
});
