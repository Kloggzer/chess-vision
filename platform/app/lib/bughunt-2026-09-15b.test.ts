/** Quelltext-Ratschen auf verwaiste Job-Slots, tote Felder und bewusst unverdrahteten Code. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

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

async function files(): Promise<{ rel: string; text: string }[]> {
  const root = process.cwd();
  const all = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  return Promise.all(all.map(async (f) => ({
    rel: path.relative(root, f).split(path.sep).join("/"),
    text: await readFile(f, "utf8"),
  })));
}

// Ohne Freigabe zeigt `queue.live` auf ein totes Kind, und `stopRunning` meldet einen Stopp, den es nie gab.
test("every spawner in runners.ts releases queue.live and answers a spawn error", async () => {
  const src = await readFile(path.join(process.cwd(), "lib", "chain/runners.ts"), "utf8");
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

// Deckt auch `handScanned`: ohne Leser sagt die Karte "keine Hand" ueber nie gescannte Aufnahmen.
test("no LabelStream field is written on every load and read nowhere", async () => {
  const all = await files();
  const elsewhere = all.filter((f) => f.rel !== "lib/label/label-stream.ts").map((f) => code(f.text)).join("\n");

  const src = all.find((f) => f.rel === "lib/label/label-stream.ts")!.text;
  const block = /export type LabelStream = \{([\s\S]*?)\n\};/.exec(src)?.[1] ?? "";
  const fields = [...code(block).matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
  // Die Zaehler in `reads` sind eigene Felder — `without` wurde je Aufnahme hochgezaehlt.
  fields.push(...[...code(block).matchAll(/\{ \w+: number; (\w+): number \}/g)].map((m) => m[1]));
  expect(fields).toContain("boards");

  const orphans = fields.filter((f) => !new RegExp("\\." + f + "\\b").test(elsewhere));
  expect(orphans, "geschrieben, nie gelesen").toEqual([]);
});

// `matte.jsonl` trug `disputed` in jede Zeile und niemand fragte es ab.
const ORPHANS: readonly [string, string][] = [["lib/session-store/matte.ts", "disputed"]];

test("a field a reader parses has somebody who asks for it", async () => {
  const all = await files();
  for (const [producer, field] of ORPHANS) {
    const hits = all.filter((f) => new RegExp(`\\b${field}\\b`).test(code(f.text))).map((f) => f.rel);
    const readers = hits.filter((rel) => rel !== producer);
    expect(readers.length === 0 && hits.length > 0, `${producer}: ${field} wird geparst und nirgends gelesen`).toBe(false);
  }
});

// `prob`/`margin` wanderten in jede `StreamAuditCell` und wurden nie gelesen.
test("prob und margin bleiben aus der Audit-Zelle draussen", async () => {
  const stream = await readFile(path.join(process.cwd(), "lib", "label/label-stream.ts"), "utf8");
  const audit = stream.slice(stream.indexOf("StreamAuditCell"), stream.indexOf("StreamAuditCell") + 400);

  expect(audit, "wer sie zurueckholt, bringt den Leser mit").not.toMatch(/margin\s*:/);
});

// Beide Enden des Positions-Carry sind unverdrahtet; knip sieht es nicht, weil ein Test als Einstieg zaehlt.
test("carryPositionCorrections is still unwired — a decision, not an oversight", async () => {
  const callers = (await files())
    .filter((f) => f.rel !== "lib/label/position-carry.ts" && f.text.includes("carryPositionCorrections"))
    .map((f) => f.rel);
  expect(callers, "Der Carry ist bewusst unverdrahtet (docs/offene-entscheidungen.md). Wer ihn anschliesst, dreht diese Zusicherung um.").toEqual([]);
});

test("the prefilled prop stays accepted so wiring it later is one call", async () => {
  const passers = (await files())
    .filter((f) => f.rel !== "components/board-paint.tsx" && /\bprefilled=/.test(f.text))
    .map((f) => f.rel);
  expect(passers, "Die Gegenseite steht bereit: `prefilled` wird bis in `planBoard` verarbeitet, nur nie gefuellt.").toEqual([]);
});
