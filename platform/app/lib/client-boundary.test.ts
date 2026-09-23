import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";

/** Ein einziger WERT-Import aus einem Server-Modul buendelt `node:fs` in den Browser, und Turbopack
 *  scheitert zur Laufzeit mit einem Stack auf Reacts hydrate (2026-08-09) — weder tsc noch eslint sehen es. */
const ROOTS = ["app", "components", "lib"];
const NODE_IMPORT = /from\s+"node:/;
/** `[^;]`, nicht `[\s\S]`: sonst liefe die Klausel bis zum `from` eines SPAETEREN Imports. */
const VALUE_IMPORT = /^import\s+(?!type\s)[^;]*?\s+from\s+"@\/lib\/([\w-]+)"/gm;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

test("no client component imports a value from a filesystem-touching lib module", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  const text = new Map(await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")] as const)));

  const libs = [...text].filter(([f]) => f.includes(`${path.sep}lib${path.sep}`));
  const touchesFs = new Set(libs.filter(([, t]) => NODE_IMPORT.test(t)).map(([f]) => path.basename(f, ".ts")));
  // TRANSITIV, seit `lib/history.ts` (2026-09-08): ein Modul ohne eigenes `node:` reicht die Platte
  // trotzdem weiter, und der Bundle-Fehler nennt dann ein Modul, das sauber aussieht.
  for (let grew = true; grew; ) {
    grew = false;
    for (const [file, body] of libs) {
      const mine = path.basename(file, ".ts");
      if (touchesFs.has(mine)) continue;
      for (const [, mod] of body.matchAll(VALUE_IMPORT)) {
        if (!touchesFs.has(mod)) continue;
        touchesFs.add(mine);
        grew = true;
        break;
      }
    }
  }
  // If this is empty the test proves nothing — the loader must still be a filesystem module.
  expect(touchesFs).toContain("model-reads");

  const offences: string[] = [];
  for (const [file, body] of text) {
    if (!body.startsWith('"use client"')) continue;
    for (const [, mod] of body.matchAll(VALUE_IMPORT)) {
      if (touchesFs.has(mod)) offences.push(`${path.relative(root, file)} -> @/lib/${mod}`);
    }
  }
  expect(offences).toEqual([]);
});
