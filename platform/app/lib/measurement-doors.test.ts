/**
 * „Nicht gemessen" ist etwas anderes als „gemessen null". `lib/measurement.ts` ist die eine
 * Antwort darauf; diese Liste sind die Stellen davor, die ein gescheitertes Lesen weiterhin zu
 * einer leeren Antwort machen — sie darf nur SCHRUMPFEN.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";
import { measurementDoorsIn } from "@/ratchet-detect";

const ROOT = path.join(__dirname, "..");
const LEDGER = path.join(ROOT, "measurement-doors.txt");
/** Die Tuer selbst und der Treuhaender, den sie benutzt — sie BEANTWORTEN die Frage. */
const ALLOWED = ["lib/measurement.ts", "lib/jsonl.ts"];

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

async function pastTheDoor(): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  for (const dir of ["lib", "app"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      // Ein Test baut sein eigenes Fixture und erfindet dabei keine Lesepolitik.
      if (ALLOWED.includes(rel) || /\.test\.tsx?$/.test(rel)) continue;
      const n = measurementDoorsIn(await readFile(file, "utf8"));
      if (n > 0) found.set(rel, n);
    }
  }
  return found;
}

async function ledger(): Promise<Map<string, number>> {
  const text = await readFile(LEDGER, "utf8");
  return new Map(
    text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#"))
      .map((l) => [l.split(/\s+/)[1], Number(l.split(/\s+/)[0])] as [string, number]),
  );
}

test("keine neue Stelle macht aus einem Lesefehler eine leere Messung", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const seen = await pastTheDoor();
  const known = await ledger();
  const fresh = [...seen.keys()].filter((f) => !known.has(f));
  expect(fresh, "nimm `loadMeasurement` aus lib/measurement.ts — ENOENT ist die EINZIGE leere Antwort").toEqual([]);
});

test("eine bekannte Stelle waechst nicht", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const seen = await pastTheDoor();
  for (const [file, budget] of await ledger()) {
    expect(seen.get(file) ?? 0, file).toBeLessThanOrEqual(budget);
  }
});

test("die Liste traegt keine erledigte Zeile mehr", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const seen = await pastTheDoor();
  const stale = [...(await ledger())].filter(([f, n]) => (seen.get(f) ?? 0) < n);
  expect(stale, "schreib die Zahl herunter — die Ratsche darf nur schrumpfen").toEqual([]);
});
