import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * `LabelStream.handScanned` is the one thing that separates "scanned, no hand" from "never
 * scanned" — `lanes.handBeside` returns `null` for both and its own doc points at this field for
 * the answer. The stream builds the array on every load; if nobody reads it, the card silently
 * says "no hand" about a recording `frame-hands.jsonl` has never seen.
 */
const FIELD = "handScanned";
const ROOTS = ["app", "components", "lib"];
const PRODUCER = path.join("lib", "label-stream.ts");

/** Comments do not read a value — `lanes.ts` names the field in prose and uses none of it. */
const code = (text: string): string =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

test("handScanned reaches a reader outside the module that writes it", async () => {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  const readers: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    if (rel === PRODUCER) continue;
    if (code(await readFile(file, "utf8")).includes(FIELD)) readers.push(rel);
  }
  expect(readers, `${FIELD} is written on every stream load and read nowhere`).not.toEqual([]);
});
