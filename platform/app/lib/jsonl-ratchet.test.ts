/** Wer `.jsonl` selbst schneidet, beantwortet Leerzeile und halbe letzte Zeile neu — und lag schon
 *  mehrfach daneben. `lib/jsonl.ts` ist die eine Antwort; `jsonl-readers.txt` darf nur SCHRUMPFEN. */
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, onTestFinished, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";
import { jsonlCutsIn } from "@/ratchet-detect";

const ROOT = path.join(__dirname, "..");
const LEDGER = path.join(ROOT, "jsonl-readers.txt");
const ALLOWED = ["lib/jsonl.ts", "lib/jsonl.test.ts", "lib/jsonl-ratchet.test.ts"];
const BS = String.fromCharCode(92);
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
      const n = jsonlCutsIn(text);
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

test("keine neue Stelle schneidet JSONL selbst in Zeilen", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const seen = await handRolled();
  const known = await ledger();
  const fresh = [...seen.keys()].filter((f) => !known.has(f));
  expect(fresh, "nutzt `jsonlRows` aus lib/jsonl.ts").toEqual([]);
});

test("eine bekannte Stelle waechst nicht", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const seen = await handRolled();
  for (const [file, budget] of await ledger()) {
    expect(seen.get(file) ?? 0, file).toBeLessThanOrEqual(budget);
  }
});

test("die Liste traegt keine erledigte Zeile mehr", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const seen = await handRolled();
  const stale = [...(await ledger())].filter(([f, n]) => (seen.get(f) ?? 0) < n);
  expect(stale, "schreib die Zahl herunter — die Ratsche darf nur schrumpfen").toEqual([]);
});

/** Gegenprobe auf die FORM: der Python-Zwilling suchte Schreibweisen und liess 16 Stellen durch. */
test("jede Schreibweise des Zeilenschnitts zaehlt, nicht nur die vier bekannten", { timeout: TREE_SCAN_TIMEOUT }, () => {
  const N = BS + "n";
  const planted = [
    `text.split("${N}")`, `text.split('${N}')`, `text.split(\`${N}\`)`,
    `text.split(/${BS}r?${N}/)`, `text.split(/${N}/)`, `text.split("${BS}r${N}")`,
    `text.split(String.fromCharCode(10))`, `text.split( "${N}" )`,
  ];
  for (const form of planted) expect(jsonlCutsIn(form), form).toBeGreaterThan(0);
  // Und ein Schnitt, der KEINE Zeilen macht, darf die Ratsche nicht fuellen.
  expect(jsonlCutsIn(`stamped.split(":")`)).toBe(0);
});

/** Gegenprobe auf den Gang: eine fremde Datei darf keine Stelle erfinden (`route-coverage.test.ts`). */
test("der Gang ueberspringt node_modules und Punktverzeichnisse", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const base = path.join(tmpdir(), `jr-${process.pid}-${Date.now()}`);
  onTestFinished(() => rm(base, { recursive: true, force: true }));
  for (const rel of ["node_modules/fremd", ".next/cache", "lib"]) {
    await mkdir(path.join(base, rel), { recursive: true });
    await writeFile(path.join(base, rel, "x.ts"), `JSON.parse(t.split("${BS}n")[0])`, "utf8");
  }

  const gefunden = await sources(base);

  expect(gefunden.map((f) => path.relative(base, f).split(path.sep).join("/")))
    .toEqual(["lib/x.ts"]);
});
