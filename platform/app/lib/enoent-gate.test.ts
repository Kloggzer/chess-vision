/** Die ENOENT-Regel steht EINMAL, in `lib/measurement.ts` (`absentOnly`). Jede benannte Kopie ist
 *  eine Stelle, die eines Tages `EACCES` als „nicht da" liest — deshalb null, nicht eine Liste. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";
import { enoentGateCopiesIn } from "@/ratchet-detect";

const ROOT = path.join(__dirname, "..");
const ORIGINAL = "lib/measurement.ts";

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

test("keine private Kopie von absentOnly", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const copies: string[] = [];
  for (const dir of ["lib", "app"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      if (rel === ORIGINAL) continue;
      copies.push(...enoentGateCopiesIn(await readFile(file, "utf8")).map((n) => `${rel}: ${n}`));
    }
  }
  expect(copies, "importier `absentOnly` aus lib/measurement.ts").toEqual([]);
});

test("der Erkenner sieht das Original selbst", async () => {
  expect(enoentGateCopiesIn(await readFile(path.join(ROOT, ORIGINAL), "utf8"))).toEqual(["absentOnly"]);
});

test("Gegenprobe: jede Schreibweise der Regel zaehlt", () => {
  const E = '"ENOENT"';
  expect(enoentGateCopiesIn(`function gone(e: unknown): null {\n  if ((e as { code?: string })?.code !== ${E}) throw e;\n  return null;\n}`)).toEqual(["gone"]);
  expect(enoentGateCopiesIn(`const gone = (e: NodeJS.ErrnoException) => { if (e?.code != ${E}) throw e; return []; };`)).toEqual(["gone"]);
  expect(enoentGateCopiesIn(`const gone = e => { if (e.code === ${E}) return false; throw e; };`)).toEqual(["gone"]);
  expect(enoentGateCopiesIn(`function gone(err) { if (err.code !== ${E} && err.code !== "ENOTDIR") throw err; return null; }`)).toEqual(["gone"]);
});

test("Gegenprobe: Benutzer der Tuer und eigene Leser zaehlen nicht", () => {
  const E = '"ENOENT"';
  expect(enoentGateCopiesIn("const s = await stat(f).catch(absentOnly);")).toEqual([]);
  expect(enoentGateCopiesIn(`async function read(f: string) { try { return await readFile(f); } catch (e) { if (e.code !== ${E}) throw e; return ""; } }`)).toEqual([]);
  expect(enoentGateCopiesIn(`async function unexported(n: string, e: unknown) { if (e.code !== ${E}) return false; return stat(n).then(() => false); }`)).toEqual([]);
  expect(enoentGateCopiesIn(`// function gone(e) { if (e.code !== ${E}) throw e; return null; }`)).toEqual([]);
});
