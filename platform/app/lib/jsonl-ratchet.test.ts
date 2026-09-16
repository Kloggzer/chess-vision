/**
 * Wer `.jsonl` selbst in Zeilen schneidet, beantwortet die Leerzeile und die halb geschriebene
 * letzte Zeile neu — und lag dabei schon mehrfach daneben. `lib/jsonl.ts` ist die eine Antwort;
 * diese Liste sind die Stellen davor und darf nur SCHRUMPFEN.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const ROOT = path.join(__dirname, "..");
const LEDGER = path.join(ROOT, "jsonl-readers.txt");
const ALLOWED = ["lib/jsonl.ts", "lib/jsonl.test.ts", "lib/jsonl-ratchet.test.ts"];
const BS = String.fromCharCode(92);
/** Die vier Schreibweisen, in denen diese App eine Datei in Zeilen schneidet. */
const CUTS = [`.split("${BS}n")`, `.split('${BS}n')`, `.split(/${BS}r?${BS}n/)`,
  ".split(String.fromCharCode(10))"];

function cuts(text: string): number {
  return CUTS.reduce((n, needle) => n + text.split(needle).length - 1, 0);
}

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

/** Zeilenschnitt UND `JSON.parse` in derselben Datei — das ist die Form, die die Politik neu erfindet. */
async function handRolled(): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  for (const dir of ["lib", "app"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      // Ein Test zerlegt sein eigenes Fixture; das ist kein Leser.
      if (ALLOWED.includes(rel) || /\.test\.tsx?$/.test(rel)) continue;
      const text = await readFile(file, "utf8");
      if (!text.includes("JSON.parse")) continue;
      const n = cuts(text);
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

test("keine neue Stelle schneidet JSONL selbst in Zeilen", async () => {
  const seen = await handRolled();
  const known = await ledger();
  const fresh = [...seen.keys()].filter((f) => !known.has(f));
  expect(fresh, "nutzt `jsonlRows` aus lib/jsonl.ts").toEqual([]);
});

test("eine bekannte Stelle waechst nicht", async () => {
  const seen = await handRolled();
  for (const [file, budget] of await ledger()) {
    expect(seen.get(file) ?? 0, file).toBeLessThanOrEqual(budget);
  }
});

test("die Liste traegt keine erledigte Zeile mehr", async () => {
  const seen = await handRolled();
  const stale = [...(await ledger())].filter(([f, n]) => (seen.get(f) ?? 0) < n);
  expect(stale, "schreib die Zahl herunter — die Ratsche darf nur schrumpfen").toEqual([]);
});
