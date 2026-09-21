/**
 * Ein zweites Bestaetigen darf keine menschlichen Zugurteile loeschen.
 *
 * `writeConfirmation` rechnet `reviewed_plies` vollstaendig neu und ERSETZT den Schluessel; das
 * Serverstueck darf das auch (sonst waere ein bewusstes Entfernen nicht mehr ausdrueckbar). Die
 * Oberflaeche muss die vorhandenen Urteile deshalb VORLADEN — tat sie nicht, und ein zweiter
 * Klick auf einer bereits bestaetigten Aufnahme schickte eine leere Liste.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { loadCandidate, writeConfirmation } from "@/lib/data";
import { buildReviewCards } from "@/lib/review-cards";
import { keptCards } from "@/lib/confirm-kept";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const MOVES = [
  { ply: 1, san: "e4", frame: 10 },
  { ply: 2, san: "e5", frame: 20 },
  { ply: 3, san: "Nf3", frame: 30 },
];

async function candidate(name = "g") {
  const root = await tempDataRoot("confirm-keep");
  const dir = await writeSession({ root, name, moves: MOVES });
  return { dir, name };
}

test("ohne Vorladen verliert der zweite Klick das Urteil — das ist die Form, die der Fix schliesst", async () => {
  const { dir, name } = await candidate();
  expect(await writeConfirmation(name, [0, 2])).toEqual([1, 3]);
  // Genau das schickte die Seite bisher: frisch geoeffnet, nichts angeklickt, Knopf gedrueckt.
  expect(await writeConfirmation(name, [])).toEqual([]);
  expect(JSON.parse(await readFile(path.join(dir, "candidate.json"), "utf8")).reviewed_plies).toEqual([]);
});

test("die Karten laden die gespeicherten reviewed_plies vor", async () => {
  const { name } = await candidate();
  await writeConfirmation(name, [0, 2]);
  const loaded = await loadCandidate(name);
  const cards = buildReviewCards({ moves: loaded.moves, indices: [0, 1, 2], stems: [] });
  expect(keptCards(cards, loaded.reviewed_plies ?? [])).toEqual({ 0: true, 2: true });
});

test("mit Vorladen ueberlebt das Urteil den zweiten Klick", async () => {
  const { name } = await candidate();
  await writeConfirmation(name, [0, 2]);
  const loaded = await loadCandidate(name);
  const cards = buildReviewCards({ moves: loaded.moves, indices: [0, 1, 2], stems: [] });
  const seeded = keptCards(cards, loaded.reviewed_plies ?? []);
  const kept = cards.filter((c) => seeded[c.id]).flatMap((c) => c.keep);
  expect(await writeConfirmation(name, kept)).toEqual([1, 3]);
});

test("ein Frame ohne Nachfolger bleibt auf `keep`, wenn nur ein Teil seiner Plies beurteilt ist", async () => {
  const { name } = await candidate();
  const loaded = await loadCandidate(name);
  const cards = buildReviewCards({ moves: loaded.moves, indices: [0, 1, 2], stems: [] });
  // Keine gespeicherte Bestaetigung: nichts ist vorgeladen, sonst waere der Vorschlag erfunden.
  expect(keptCards(cards, [])).toEqual({});
});

test("eine Ply-Nummer, die keine Karte traegt, erfindet keine Karte", async () => {
  const { name } = await candidate();
  const loaded = await loadCandidate(name);
  const cards = buildReviewCards({ moves: loaded.moves, indices: [0], stems: [] });
  expect(keptCards(cards, [2, 3])).toEqual({});
});

/** Die Frame-losen Karten tragen `keep = members`; auch die muessen sich wiederfinden. */
test("ein Mehrfach-Commit zaehlt als beurteilt, wenn jede seiner keep-Plies drin steht", async () => {
  const root = await tempDataRoot("confirm-multi");
  await writeFile(
    path.join(await writeSession({ root, name: "m", moves: MOVES }), "candidate.json"),
    JSON.stringify({
      name: "m",
      clock: { fps: 25 },
      moves: [
        { ply: 1, san: "e4", frame: 10 },
        { ply: 2, san: "e5", frame: 10 },
        { ply: 3, san: "Nf3", frame: 30 },
      ],
    }),
    "utf8",
  );
  const loaded = await loadCandidate("m");
  const cards = buildReviewCards({ moves: loaded.moves, indices: [0, 1, 2], stems: [] });
  expect(keptCards(cards, [2])).toEqual({ 0: true });
  expect(keptCards(cards, [1])).toEqual({});
});

/** Die reine Funktion nuetzt nichts, solange die Seite sie nicht fuellt: `/confirm/[name]` muss
 *  den gespeicherten Stand durchreichen, sonst steht der Fix da und wirkt nicht. */
test("die Seite reicht den gespeicherten Stand an die Karten durch", async () => {
  const page = await readFile(path.join(process.cwd(), "app", "confirm", "[name]", "page.tsx"), "utf8");
  expect(page).toMatch(/reviewedPlies=\{candidate\.reviewed_plies/);
  expect(page).toMatch(/struckPlies=\{candidate\.struck_plies/);
  const cards = await readFile(path.join(process.cwd(), "app", "confirm", "[name]", "cards.tsx"), "utf8");
  expect(cards).toMatch(/useState<Record<number, boolean>>\(\(\) => keptCards\(cards, reviewedPlies\)\)/);
  expect(cards).toMatch(/useState<Record<number, boolean>>\(\(\) => struckCards\(gallery, struckPlies\)\)/);
});
