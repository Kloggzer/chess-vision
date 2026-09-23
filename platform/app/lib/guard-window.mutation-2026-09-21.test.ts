/** Die zweite Stempel-Pruefung vor dem Umhaengen; ohne sie blieb die Suite bis 2026-09-21 gruen. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

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

test("ein gleich langer Schreiber im selben Takt bewegt den Stempel", async () => {
  const { Contested, stampOf, writeFileAtomic, writeFileAtomicGuarded } = await import("@/lib/atomic");
  const root = await tempDataRoot("guard-tick");
  const file = path.join(root, "log.jsonl");
  await writeFileAtomic(file, '{"a":1}\n');
  const before = await stampOf(file);
  await writeFileAtomic(file, '{"a":2}\n');
  await expect(writeFileAtomicGuarded(file, '{"a":3}\n', before, "log")).rejects.toThrow(Contested);
  expect(await readFile(file, "utf8")).toBe('{"a":2}\n');
});
