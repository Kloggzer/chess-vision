/** Bug-Jagd 2026-09-17, Achse Zustand/Cache/Nebenlaeufigkeit (Fund 2 und 4 stehen in position-flags/pool.test.ts). */
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

// FUND 1: `cellPng` keyte nur auf Brett- und log-mtime; `pad_side`/`board_size` stehen in `candidate.json`.
test("ein neues candidate.json aendert den Schnitt, also darf der Zell-Cache ihn nicht halten", async () => {
  const root = await tempDataRoot("cellkey");
  const dir = await writeSession({
    root,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [{ frame: 110, boardSize: 64 }],
  });
  await gradientBoard(dir, "000110", 64);
  const { cellPng } = await import("@/lib/session-store/crops");
  const before = await cellPng("g", "000110", "e4", 32);

  // Nur `candidate.json`: `log.jsonl` und das Brett bleiben Byte fuer Byte liegen.
  const candidate = JSON.parse(await readFile(path.join(dir, "candidate.json"), "utf8")) as Record<string, unknown>;
  candidate.source = { crop: { pad_side: 0.45 } };
  await writeFile(path.join(dir, "candidate.json"), JSON.stringify(candidate), "utf8");

  const after = await cellPng("g", "000110", "e4", 32);
  expect(after.equals(before)).toBe(false);
});

// FUND 3: ein gemeinsamer `${file}.tmp` — der abgewiesene Schreiber raeumte die Zwischendatei des laufenden weg.
test("ein abgewiesener Schreiber raeumt nicht die Zwischendatei des laufenden weg", async () => {
  const root = await tempDataRoot("tmpname");
  const file = path.join(root, "ledger.json");
  await writeFile(file, "alt\n", "utf8");
  await writeFile(`${file}.tmp`, "neu\n", "utf8");

  await expect(writeFileAtomicGuarded(file, "meins\n", "stempel-von-vorgestern", "ledger")).rejects.toThrow();
  expect(await stat(`${file}.tmp`).then(() => true, () => false)).toBe(true);
  await rm(`${file}.tmp`, { force: true });
});
