/**
 * `writeConfirmation` ist lesen, rechnen, ersetzen. `writeFileAtomic` verhindert nur die HALBE
 * Datei, nicht zwei Schreiber auf demselben Ausgangsstand: `struck_plies` vereinigt sich mit dem
 * gelesenen Stand, und der zweite Schreiber hatte den ersten nie gesehen.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { Contested } from "@/lib/atomic";
import { writeConfirmation } from "@/lib/data";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const MOVES = [
  { ply: 1, san: "e4", frame: 10 },
  { ply: 2, san: "e5", frame: 20 },
  { ply: 3, san: "Nf3", frame: 30 },
];

async function candidate(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  return path.join(await writeSession({ root, name: "g", moves: MOVES }), "candidate.json");
}

test("zwei gleichzeitige Streichungen verlieren keine — Gestrichenes bleibt gestrichen", async () => {
  const file = await candidate("confirm-race");
  await Promise.all([writeConfirmation("g", [], [1]), writeConfirmation("g", [], [3])]);
  const doc = JSON.parse(await readFile(file, "utf8")) as { struck_plies?: number[] };
  expect(doc.struck_plies).toEqual([1, 3]);
});

test("ein fremder Schreiber zwischen Lesen und Umhaengen wird nicht ueberrannt", async () => {
  // Der fremde Schreiber trifft das Fenster nur in 98 von 100 Laeufen: sein rohes `writeFile`
  // KUERZT zuerst, `confirmUnlocked` las dann die halbe Datei (`SyntaxError` statt `Contested`).
  // Atomar geht nicht — `rename` ueber die vom Leser geoeffnete Datei ist auf Windows EPERM.
  let caught = false;
  for (let attempt = 0; attempt < 6 && !caught; attempt++) {
    const file = await candidate(`confirm-foreign-${attempt}`);
    const original = await readFile(file, "utf8");
    await writeFile(path.join(path.dirname(file), "reference.pgn"), "1. e4 e5 2. Nf3 *\n", "utf8");
    const foreign = JSON.parse(original) as Record<string, unknown>;
    foreign.note = "von aussen geschrieben";
    const race = writeConfirmation("g", [0]).then(() => null, (e: unknown) => e);
    await writeFile(file, JSON.stringify(foreign), "utf8");
    const failure = await race;
    caught = failure instanceof Contested;
    // Egal wie der Lauf ausging: geschrieben hat der fremde Schreiber zuletzt, und das steht.
    expect(JSON.parse(await readFile(file, "utf8")).note).toBe("von aussen geschrieben");
  }
  expect(caught).toBe(true);
});

test("ohne fremden Schreiber schreibt es ganz normal", async () => {
  await candidate("confirm-plain");
  expect(await writeConfirmation("g", [0, 2])).toEqual([1, 3]);
});
