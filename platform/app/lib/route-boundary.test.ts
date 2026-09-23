/** Routen und Seiten reden mit Services, nicht mit der Platte: kein `node:fs`, und aus den Tuer-Modulen
 *  nur die Fehlerklassen (`Contested`, `isMissing`, `absentOnly`), keine Lese- oder Schreibtuer. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";

const ROOT = path.join(__dirname, "..");
const DOORS = /^import\s+\{([^}]*)\}\s+from\s+"@\/lib\/(atomic|measurement|jsonl)"/gm;
const ALLOWED = new Set(["Contested", "isMissing", "absentOnly"]);

function diskReachIn(text: string): string[] {
  const out: string[] = [];
  if (/from\s+"(node:)?fs(\/promises)?"/.test(text)) out.push("node:fs");
  for (const [, names, mod] of text.matchAll(DOORS)) {
    for (const raw of names.split(",")) {
      const name = raw.replace(/^\s*type\s+/, "").trim();
      if (name && !raw.trim().startsWith("type ") && !ALLOWED.has(name)) out.push(`${mod}.${name}`);
    }
  }
  return out;
}

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

test("app/ greift nicht selbst auf die Platte", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const offences: string[] = [];
  for (const file of await sources(path.join(ROOT, "app"))) {
    const rel = path.relative(ROOT, file).split(path.sep).join("/");
    for (const reach of diskReachIn(await readFile(file, "utf8"))) offences.push(`${rel}: ${reach}`);
  }
  expect(offences, "die Plattenfrage gehoert in einen Service unter lib/").toEqual([]);
});

test("Gegenprobe: fs-Import und Lesetuer zaehlen, Fehlerklassen und Typen nicht", () => {
  expect(diskReachIn('import { readFile } from "node:fs/promises";')).toEqual(["node:fs"]);
  expect(diskReachIn('import { exists, isMissing } from "@/lib/measurement";')).toEqual(["measurement.exists"]);
  expect(diskReachIn('import { Contested, writeFileAtomic } from "@/lib/atomic";')).toEqual(["atomic.writeFileAtomic"]);
  expect(diskReachIn('import { type Stamp, Contested } from "@/lib/atomic";')).toEqual([]);
});
