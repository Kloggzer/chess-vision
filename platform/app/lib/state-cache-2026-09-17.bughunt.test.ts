/** Bug-Jagd 2026-09-17, Achse Zustand/Cache/Nebenlaeufigkeit (Fund 1 in `cut-routes.test.ts`, Fund 2 und 4 in position-flags/pool.test.ts). */
import { rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { writeFileAtomicGuarded } from "@/lib/atomic";
import { tempDataRoot } from "@/lib/test-fixtures";

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
