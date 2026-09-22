/**
 * Eine UNLESBARE `reference.pgn` ist keine fehlende. `readReference` fing jeden Fehler und gab
 * `null` — die Confirm-Seite schrieb dann "keine reference.pgn", der Zuege-Strom liess jeden
 * Halbzug als offen stehen und `referenceProblem` blieb leer. Genau der Zustand, den `problem`
 * benennen soll, war der einzige, den niemand sehen konnte.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { readReference, truthSans } from "@/lib/data";
import { tempDataRoot } from "@/lib/test-fixtures";

async function recording(name: string): Promise<string> {
  const root = await tempDataRoot("reference-unreadable");
  const dir = path.join(root, "recordings", name);
  await mkdir(dir, { recursive: true });
  return dir;
}

test("eine fehlende reference.pgn bleibt `keine Referenz`", async () => {
  await recording("g");
  expect(await readReference("g")).toBeNull();
  expect(await truthSans("g")).toBeNull();
});

test("eine LESBARE reference.pgn wird gelesen", async () => {
  const dir = await recording("g");
  await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 2. Nf3 *\n");
  expect(await truthSans("g")).toEqual(["e4", "e5", "Nf3"]);
});

test("eine UNLESBARE reference.pgn ist keine fehlende", async () => {
  const dir = await recording("g");
  // Ein Verzeichnis an der Stelle der Datei: `readFile` wirft EISDIR, nicht ENOENT.
  await mkdir(path.join(dir, "reference.pgn"));
  await expect(readReference("g")).rejects.toMatchObject({ code: "EISDIR" });
  await expect(truthSans("g")).rejects.toMatchObject({ code: "EISDIR" });
});

test("keine Seite macht daraus wieder ein `keine PGN`", async () => {
  for (const rel of ["app/page.tsx", "app/game/[name]/page.tsx"]) {
    const text = await readFile(path.join(__dirname, "..", rel), "utf8");
    expect(/truthSans\([^)]*\)\s*\.catch/.test(text), rel).toBe(false);
  }
});
