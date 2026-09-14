import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * Werte, die der Strom bei JEDEM Laden schreibt. Wer sie nirgends liest, zahlt sie nur — und
 * `judgedCell` nimmt `prob`/`margin` sogar als Parameter entgegen und benutzt keinen davon.
 */
const ROOTS = ["app", "components", "lib"];

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

/** Jede Datei, die das Feld LIEST — der Produzent und der Parser zaehlen nicht als Leser. */
async function readersOf(field: string, producers: string[]): Promise<string[]> {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  const out: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (producers.includes(rel)) continue;
    if (new RegExp(`\.${field}\b`).test(code(await readFile(file, "utf8")))) out.push(rel);
  }
  return out;
}

test("`prob` und `margin` der Audit-Zelle erreichen einen Leser", async () => {
  // `lanes.ts` nimmt beide in der Signatur von `judgedCell` entgegen und wertet keinen aus.
  const producers = ["lib/audit-flags.ts", "lib/label-stream.ts"];
  expect(await readersOf("prob", producers), "StreamAuditCell.prob").not.toEqual([]);
  expect(await readersOf("margin", [...producers, "lib/warp.ts", "lib/stored.ts", "lib/session.ts"]),
         "StreamAuditCell.margin").not.toEqual([]);
});

test("`cov` der Stellungs-Karte erreicht einen Leser", async () => {
  // `position-flags.ts` parst und normalisiert es; `StreamPositionCell` traegt es gar nicht erst.
  expect(await readersOf("cov", ["lib/position-flags.ts", "lib/hand-flags.ts", "lib/lanes.ts",
                                 "lib/label-stream.ts", "app/corpus/sections.tsx"]),
         "PositionFlag.cov").not.toEqual([]);
});
