/**
 * Wer `.jsonl` selbst in Zeilen schneidet, beantwortet die Leerzeile und die halb geschriebene
 * letzte Zeile neu — und lag dabei schon mehrfach daneben. `lib/jsonl.ts` ist die eine Antwort;
 * diese Liste sind die Stellen davor und darf nur SCHRUMPFEN.
 */
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, onTestFinished, test } from "vitest";

const ROOT = path.join(__dirname, "..");
const LEDGER = path.join(ROOT, "jsonl-readers.txt");
const ALLOWED = ["lib/jsonl.ts", "lib/jsonl.test.ts", "lib/jsonl-ratchet.test.ts"];
const BS = String.fromCharCode(92);
/** Die FORM, nicht vier Schreibweisen: ein `split` auf irgendetwas, das einen Umbruch enthaelt.
 *  Vier Namen zu suchen liess `/\n/`, Backticks und `"\r\n"` durch — derselbe Fehler, an dem der
 *  Python-Zwilling 16 Stellen uebersah. */
const CUT = /\.split\(\s*(?:"[^"\n]*\\n[^"\n]*"|'[^'\n]*\\n[^'\n]*'|`[^`\n]*\\n[^`\n]*`|\/[^/\n]*\\n[^/\n]*\/[a-z]*|String\.fromCharCode\(10\))\s*\)/g;
/** Zeilenweise ITERATION ist derselbe Schnitt, nur unsichtbar fuer eine Textsuche: der
 *  Python-Zwilling uebersah so drei handkopierte Nachbauten seines Lesers (2026-09-17). */
const ITER = /for\s+(?:await\s+)?\(\s*const\s+(\w+)\s+of\s+([\w.]+)/g;

/** Der Rumpf der Schleife, ueber die Klammern abgezaehlt — `JSON.parse` irgendwo SONST in
 *  derselben Datei ist ein anderer Gueltigkeitsbereich und zaehlte zweimal falsch mit. */
function loopBody(text: string, from: number): string {
  const open = text.indexOf("{", from);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}" && (depth -= 1) === 0) return text.slice(open, i);
  }
  return text.slice(open);
}

function cuts(text: string): number {
  const split = [...text.matchAll(CUT)].length;
  let iter = 0;
  for (const m of text.matchAll(ITER)) {
    // Der Treuhaender selbst ist kein eigener Schnitt.
    if (m[2].startsWith("jsonlRows")) continue;
    const body = loopBody(text, (m.index ?? 0) + m[0].length);
    if (new RegExp(String.raw`JSON\.parse\(\s*` + m[1] + String.raw`\b`).test(body)) iter += 1;
  }
  return split + iter;
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

/** Gegenprobe auf die FORM: der Python-Zwilling suchte Schreibweisen und liess 16 Stellen durch. */
test("jede Schreibweise des Zeilenschnitts zaehlt, nicht nur die vier bekannten", () => {
  const N = BS + "n";
  const planted = [
    `text.split("${N}")`, `text.split('${N}')`, `text.split(\`${N}\`)`,
    `text.split(/${BS}r?${N}/)`, `text.split(/${N}/)`, `text.split("${BS}r${N}")`,
    `text.split(String.fromCharCode(10))`, `text.split( "${N}" )`,
  ];
  for (const form of planted) expect(cuts(form), form).toBeGreaterThan(0);
  // Und ein Schnitt, der KEINE Zeilen macht, darf die Ratsche nicht fuellen.
  expect(cuts(`stamped.split(":")`)).toBe(0);
});

/** Gegenprobe auf den Gang: eine fremde Datei darf keine Stelle erfinden (`route-coverage.test.ts`). */
test("der Gang ueberspringt node_modules und Punktverzeichnisse", async () => {
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
