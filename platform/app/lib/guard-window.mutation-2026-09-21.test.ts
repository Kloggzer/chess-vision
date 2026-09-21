/**
 * Der Stempel-Riegel prueft ZWEIMAL, und die zweite Pruefung ist die, die zaehlt: zwischen dem
 * ersten Blick und dem Umhaengen liegt das Serialisieren, und genau in diesem Fenster schreibt
 * der andere. Ohne sie haengt `rename` blind um und das fremde Urteil ist weg — die Mutation
 * (zweite Pruefung entfernt) liess bis 2026-09-21 die ganze Suite gruen.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

/** Der Fremdschreiber schlaegt zu, waehrend unser Koerper in die Nebendatei geht. */
let intruder: { file: string; body: string } | null = null;

vi.mock("node:fs/promises", async () => {
  const real = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  const writeFile: typeof real.writeFile = async (file, body, options) => {
    const done = await real.writeFile(file, body, options);
    if (intruder && String(file).endsWith(".tmp")) {
      const now = intruder;
      intruder = null;
      await real.writeFile(now.file, now.body, "utf8");
    }
    return done;
  };
  return { ...real, writeFile, default: { ...real, writeFile } };
});

test("ein Schreiber im Serialisier-Fenster wird nicht ueberbuegelt", async () => {
  const { Contested, stampOf, writeFileAtomicGuarded } = await import("@/lib/atomic");
  const root = await tempDataRoot("guard-window");
  await mkdir(path.join(root, "labels"), { recursive: true });
  const file = path.join(root, "labels", "reference.pgn");
  await writeFile(file, "1. e4 e5\n", "utf8");

  const before = await stampOf(file);
  intruder = { file, body: "1. d4 d5\n" };
  await expect(writeFileAtomicGuarded(file, "1. c4 c5\n", before, "reference")).rejects.toThrow(Contested);

  expect(await readFile(file, "utf8"), "das fremde Urteil wurde ueberschrieben").toBe("1. d4 d5\n");
});
