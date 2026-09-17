/**
 * Bug-Jagd 2026-09-17, Achse Zustand/Cache/Nebenlaeufigkeit. Drei Funde, je ein roter Test.
 */
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";
import { writeFileAtomicGuarded } from "@/lib/atomic";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/** Ein Verlauf, damit zwei verschieden geschnittene Boxen verschiedene Bytes ergeben. */
async function gradientBoard(dir: string, stem: string, side: number): Promise<void> {
  const data = Buffer.alloc(side * side * 3);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const at = (y * side + x) * 3;
      data[at] = (x * 255) / side;
      data[at + 1] = (y * 255) / side;
      data[at + 2] = ((x + y) * 255) / (2 * side);
    }
  }
  await mkdir(path.join(dir, "boards"), { recursive: true });
  await writeFile(
    path.join(dir, "boards", `${stem}.webp`),
    await sharp(data, { raw: { width: side, height: side, channels: 3 } }).webp({ lossless: true }).toBuffer(),
  );
}

// FUND 1: `cellPng` keyt auf Brett-mtime und log-mtime, aber `pad_side` und `board_size` stehen in
// `candidate.json`. Ein Re-Profilieren laesst beide gekeyten Dateien in Ruhe, und der Cache
// serviert den alten Schnitt weiter — genau die Klasse, die der Kommentar dort ausschliessen will.
test("ein neues candidate.json aendert den Schnitt, also darf der Zell-Cache ihn nicht halten", async () => {
  const root = await tempDataRoot("cellkey");
  const dir = await writeSession({
    root,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [{ frame: 110, boardSize: 64 }],
  });
  await gradientBoard(dir, "000110", 64);
  const { cellPng } = await import("@/lib/crops");
  const before = await cellPng("g", "000110", "e4", 32);

  // Nur `candidate.json`: `log.jsonl` und das Brett bleiben Byte fuer Byte liegen.
  const candidate = JSON.parse(await readFile(path.join(dir, "candidate.json"), "utf8")) as Record<string, unknown>;
  candidate.source = { crop: { pad_side: 0.45 } };
  await writeFile(path.join(dir, "candidate.json"), JSON.stringify(candidate), "utf8");

  const after = await cellPng("g", "000110", "e4", 32);
  expect(after.equals(before)).toBe(false);
});

// FUND 2: `loadMatte` faengt JEDEN Lesefehler als "" ab und legt das leere Ergebnis unter dem
// ECHTEN `mtimeMs:size`-Stempel ab. Aus "konnte nicht gelesen werden" wird "nie gemattet" — und es
// bleibt so, bis sich die Datei bewegt. `corrections.ts` und `unusable-cells.ts` machen es richtig.
test("ein unlesbares matte.jsonl ist kein handfreies Brett", async () => {
  const root = await tempDataRoot("mattefail");
  const dir = path.join(root, "recordings", "g");
  // stat gelingt, readFile wirft EISDIR — dieselbe Form wie EBUSY/EMFILE unter Last.
  await mkdir(path.join(dir, "matte.jsonl"), { recursive: true });
  (globalThis as { __chesslabMattes?: Map<string, unknown> }).__chesslabMattes?.clear();
  const { loadMatte } = await import("@/lib/matte");
  await expect(loadMatte("g")).rejects.toThrow();
});

// FUND 3: `writeFileAtomic*` nimmt fuer JEDEN Schreiber denselben `${file}.tmp`. Wer abbricht,
// raeumt im `catch` die Zwischendatei eines anderen weg, der noch nicht umgehaengt hat — und der
// verliert seinen Schreibvorgang mit ENOENT, obwohl er den Riegel hielt.
test("ein abgewiesener Schreiber raeumt nicht die Zwischendatei des laufenden weg", async () => {
  const root = await tempDataRoot("tmpname");
  const file = path.join(root, "ledger.json");
  await writeFile(file, "alt\n", "utf8");
  // Die Zwischendatei eines Schreibers, der gleich umhaengen will.
  await writeFile(`${file}.tmp`, "neu\n", "utf8");

  await expect(writeFileAtomicGuarded(file, "meins\n", "stempel-von-vorgestern", "ledger")).rejects.toThrow();
  expect(await stat(`${file}.tmp`).then(() => true, () => false)).toBe(true);
  await rm(`${file}.tmp`, { force: true });
});

// FUND 4: dieselbe Klasse wie Fund 2, eine Datei weiter. `keyedLogs` liest `log.jsonl` ungefedert
// (richtig), `loadPool` faengt beim NACHBARN `corrections.jsonl` jeden Fehler als "" ab — der
// Crop-Pool zeigt die Urteile der Aufnahme dann als nie gefaellt, gecacht unter dem echten Stempel.
test("ein unlesbares corrections.jsonl ist kein Pool ohne Korrekturen", async () => {
  const root = await tempDataRoot("poolfail");
  const dir = await writeSession({ root, rows: [{ frame: 234 }] });
  await mkdir(path.join(dir, "corrections.jsonl"), { recursive: true });
  delete (globalThis as { __chesslabPool?: unknown }).__chesslabPool;
  const { loadPool } = await import("@/lib/pool");
  await expect(loadPool()).rejects.toThrow();
});
