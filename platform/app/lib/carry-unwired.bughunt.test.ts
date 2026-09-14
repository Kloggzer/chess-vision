import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * `carryPositionCorrections` carries a painted position onto the later frames of the same ply, and
 * `board-paint.tsx` declares the `prefilled` prop that would receive it. Neither end is wired: the
 * only importer is the test file, and no component ever passes `prefilled=`. knip misses it because
 * a test counts as an entry point.
 */
const ROOTS = ["app", "components", "lib"];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

async function files(): Promise<{ rel: string; text: string }[]> {
  const root = process.cwd();
  const all = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  return Promise.all(all.map(async (f) => ({
    rel: path.relative(root, f).split(path.sep).join("/"),
    text: await readFile(f, "utf8"),
  })));
}

test("carryPositionCorrections has a production caller", async () => {
  const callers = (await files())
    .filter((f) => f.rel !== "lib/position-carry.ts" && f.text.includes("carryPositionCorrections"))
    .map((f) => f.rel);
  expect(callers, "BUG: only lib/position-carry.test.ts calls it — the carry never runs").not.toEqual([]);
});

test("something passes the prefilled prop board-paint accepts", async () => {
  const passers = (await files())
    .filter((f) => f.rel !== "components/board-paint.tsx" && /\bprefilled=/.test(f.text))
    .map((f) => f.rel);
  expect(passers, "BUG: the receiving prop has no caller either").not.toEqual([]);
});
