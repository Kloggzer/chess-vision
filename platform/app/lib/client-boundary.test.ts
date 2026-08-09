import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * No `"use client"` file may pull a filesystem module into the browser bundle.
 *
 * The type system does not catch this and neither does eslint: `import type` is erased, so a
 * client component can name a server module for years and be fine — until someone imports one
 * VALUE from it. Then the whole module, `node:fs/promises` included, is bundled for the browser
 * and Turbopack fails the page at runtime with a stack that points at React's hydrate, not at the
 * import. That happened on 2026-08-09 over a single shared constant; the pure half now lives in
 * `lib/query.ts` and this keeps the two apart.
 */
const ROOTS = ["app", "components", "lib"];
const NODE_IMPORT = /from\s+"node:/;
/**
 * `import ... from "@/lib/x"` where the clause is NOT `import type`.
 *
 * `[^;]` and not `[\s\S]` on purpose: a lazy any-character clause happily starts at one import
 * statement and runs to the `from` of a LATER one, which reported three `import type` lines as
 * value imports the first time this ran. Every import ends in a semicolon, so that is the fence.
 */
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

test("no client component imports a value from a filesystem-touching lib module", async () => {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  const text = new Map(await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")] as const)));

  const touchesFs = new Set(
    [...text].filter(([f, t]) => f.includes(`${path.sep}lib${path.sep}`) && NODE_IMPORT.test(t)).map(([f]) => path.basename(f, ".ts")),
  );
  // If this is empty the test proves nothing — the loader must still be a filesystem module.
  expect(touchesFs).toContain("proposals");

  const offences: string[] = [];
  for (const [file, body] of text) {
    if (!body.startsWith('"use client"')) continue;
    for (const [, mod] of body.matchAll(VALUE_IMPORT)) {
      if (touchesFs.has(mod)) offences.push(`${path.relative(root, file)} -> @/lib/${mod}`);
    }
  }
  expect(offences).toEqual([]);
});
