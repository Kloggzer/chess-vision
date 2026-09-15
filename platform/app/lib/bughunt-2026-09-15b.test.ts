/** Zwei Funde vom 2026-09-15: der verwaiste Job-Slot und die ungelesenen Strom-Felder. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * `runDesktop` gibt den Slot zurueck, `appended` nicht — danach zeigt `queue.live` auf ein totes
 * Kind mit `pid`, und `stopRunning` meldet einen Stopp, den es nie gab (und vergiftet `endState`).
 */
test("every spawner in jobs.ts releases queue.live and answers a spawn error", async () => {
  const src = await readFile(path.join(process.cwd(), "lib", "jobs.ts"), "utf8");
  const bodies = src
    .split(/\n(?=(?:export )?(?:async )?function )/)
    .filter((b) => b.includes("queue.live = {"));
  expect(bodies.length).toBeGreaterThan(1);
  for (const body of bodies) {
    const name = /function (\w+)/.exec(body)?.[1] ?? "?";
    expect(body, `${name} laesst queue.live stehen`).toContain("queue.live = null");
    expect(body, `${name} hat keinen error-Handler`).toContain('.on("error"');
  }
});

/** Ein Feld, das der Strom bei jedem Laden schreibt und niemand liest, ist kein Feld. */
const ROOTS = ["app", "components", "lib"];
const PRODUCER = path.join("lib", "label-stream.ts");

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

test("no LabelStream field is written on every load and read nowhere", async () => {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  const others = await Promise.all(
    files.filter((f) => path.relative(root, f) !== PRODUCER).map((f) => readFile(f, "utf8")),
  );
  const elsewhere = others.map(code).join("\n");

  const src = await readFile(path.join(root, PRODUCER), "utf8");
  const block = /export type LabelStream = \{([\s\S]*?)\n\};/.exec(src)?.[1] ?? "";
  const fields = [...code(block).matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
  // Die Zaehler in `reads` sind eigene Felder — `without` wurde je Aufnahme hochgezaehlt.
  fields.push(...[...code(block).matchAll(/\{ \w+: number; (\w+): number \}/g)].map((m) => m[1]));
  expect(fields).toContain("boards");

  const orphans = fields.filter((f) => !new RegExp("\\." + f + "\\b").test(elsewhere));
  expect(orphans, "geschrieben, nie gelesen").toEqual([]);
});

/**
 * Ratsche: `matte.jsonl` trug `disputed` in jede Zeile und niemand fragte es ab. Wer es
 * zurueckholt, braucht einen Leser — sonst kostet es nur Parse-Zeit je Frame.
 */
const ORPHANS: readonly [string, string][] = [[path.join("lib", "matte.ts"), "disputed"]];

test("a field a reader parses has somebody who asks for it", async () => {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  for (const [producer, field] of ORPHANS) {
    const hits: string[] = [];
    for (const file of files) {
      const rel = path.relative(root, file);
      if (new RegExp("\b" + field + "\b").test(code(await readFile(file, "utf8")))) hits.push(rel);
    }
    const readers = hits.filter((rel) => rel !== producer);
    expect(readers.length === 0 && hits.length > 0, `${producer}: ${field} wird geparst und nirgends gelesen`).toBe(false);
  }
});
