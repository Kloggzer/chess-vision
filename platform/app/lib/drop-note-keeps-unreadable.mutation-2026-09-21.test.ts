/**
 * Ein Widerruf schreibt das GLOBALE Urteils-Ledger neu. Eine Zeile, die dabei niemand deuten kann,
 * ist trotzdem das Urteil eines Menschen — sie wegzulassen loescht es lautlos, und keine Sitzung
 * bekommt es zurueck. Die Mutation (unlesbare Zeile faellt weg) liess die Suite gruen.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { dropReviewNotes, reviewNotesPath } from "@/lib/review-notes";
import { tempDataRoot } from "@/lib/test-fixtures";

const note = (frame: string) =>
  JSON.stringify({ session_id: "rg-rec-1", frame, verdict: "unusable-board", ts: "2026-09-21T00:00:00+00:00" });
/** Halb geschrieben MITTENDRIN — ein Lauf wurde erschlagen, der naechste haengte dahinter an. */
const UNREADABLE = '{"session_id":"rg-rec-1","frame":"000009","verd';

let file: string;

beforeEach(async () => {
  const root = await tempDataRoot("drop-unreadable");
  await mkdir(path.join(root, "labels"), { recursive: true });
  file = reviewNotesPath();
});

test("ein Widerruf laesst eine unlesbare Zeile stehen", async () => {
  await writeFile(file, [note("000001"), UNREADABLE, note("000002")].join("\n") + "\n", "utf8");

  const dropped = await dropReviewNotes([{ session_id: "rg-rec-1", frame: "000001", verdict: "unusable-board" }]);

  const lines = (await readFile(file, "utf8")).split("\n").filter((l) => l !== "");
  expect(dropped).toBe(1);
  expect(lines, "das unleserliche Urteil wurde beim Neuschreiben verschluckt")
    .toEqual([UNREADABLE, note("000002")]);
});
