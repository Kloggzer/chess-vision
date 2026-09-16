/**
 * Die Leser, die `.jsonl` bis 2026-09-16 selbst zerschnitten: beide sprangen ueber eine kaputte
 * Zeile MITTENDRIN hinweg, und in beiden Faellen las sich der Verlust als gemessene Normalitaet.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

function forget(key: string): void {
  (globalThis as Record<string, unknown>)[key] = new Map();
}

const matteRow = (stem: string) =>
  JSON.stringify({ frame: stem, ply: 1, reason: "occluded", concepts: { hand: 1 }, coverage: { e2: 0.9 } });

async function matteFile(prefix: string, text: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const dir = await writeSession({ root, name: "g", rows: [{ frame: 100 }] });
  await writeFile(path.join(dir, "matte.jsonl"), text, "utf8");
  forget("__chesslabMattes");
  return "g";
}

test("eine kaputte Zeile mitten in matte.jsonl wird gemeldet, nicht uebersprungen", async () => {
  const name = await matteFile("matte-corrupt", `${matteRow("000100")}\n{"frame": "000200"\n${matteRow("000300")}\n`);
  const { loadMatte } = await import("@/lib/matte");
  // Uebersprungen las sich das Frame als NIE gemattet — dieselbe Antwort wie fuer ein Frame, das
  // SAM nie gesehen hat, obwohl sein Alpha auf der Platte liegt.
  await expect(loadMatte(name)).rejects.toThrow(/beschaedigte Zeile/);
});

test("die halbe LETZTE Zeile in matte.jsonl kostet die Lane nichts", async () => {
  const name = await matteFile("matte-tail", `${matteRow("000100")}\n{"frame": "000200"`);
  const { loadMatte } = await import("@/lib/matte");
  expect([...(await loadMatte(name)).keys()]).toEqual(["000100"]);
});

async function ledger(prefix: string, text: string): Promise<void> {
  const root = await tempDataRoot(prefix);
  await mkdir(path.join(root, "labels"), { recursive: true });
  await writeFile(path.join(root, "labels", "review-notes.jsonl"), text, "utf8");
  forget("__chesslabReviewNotes");
}

const verdict = (frame: string) =>
  JSON.stringify({ session_id: "rg-g", frame, verdict: "unusable-board", ts: "2026-09-16T10:00:00+00:00" });

test("eine kaputte Zeile mitten im Urteils-Ledger wird gemeldet, nicht uebersprungen", async () => {
  await ledger("notes-corrupt", `${verdict("000100")}\n{"session_id": "rg-g"\n${verdict("000300")}\n`);
  const { unusableBoards } = await import("@/lib/review-notes");
  // Still uebersprungen verlor das Urteil eines Menschen: das weggeworfene Frame stand danach
  // wieder in der Lane, ohne dass irgendwo ein Fehler auftauchte.
  await expect(unusableBoards("rg-g")).rejects.toThrow(/beschaedigte Zeile/);
});

test("die halbe LETZTE Zeile des Urteils-Ledgers ist ein laufendes Anhaengen", async () => {
  await ledger("notes-tail", `${verdict("000100")}\n{"session_id": "rg-g"`);
  const { unusableBoards } = await import("@/lib/review-notes");
  expect([...(await unusableBoards("rg-g"))]).toEqual(["000100"]);
});
