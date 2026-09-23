/** Jede geteilte Datei einer Aufnahme hat EINEN Besitzer: `lib/session-store/`. Wer den Namen selbst
 *  schreibt, baut sich eine zweite Tuer an ihren Schutzregeln vorbei (`docs/web-architektur.md`). */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { TREE_SCAN_TIMEOUT } from "@/lib/test-fixtures";

const ROOT = path.join(__dirname, "..");
const OWNER = "lib/session-store/";
const EXEMPT = ["lib/test-fixtures.ts"];
/** `label="reference.pgn"` ist Anzeige-Text, kein Pfad — daher nicht direkt hinter `=`. */
const NAMED = /(?<![=\w])["'](log\.jsonl|matte\.jsonl|candidate\.json|reference\.pgn|model-reads\.jsonl)["']/g;

const namedIn = (text: string): string[] => [...text.matchAll(NAMED)].map((m) => m[1]);

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

test("nur lib/session-store/ nennt die Dateien einer Aufnahme", { timeout: TREE_SCAN_TIMEOUT }, async () => {
  const offences: string[] = [];
  for (const dir of ["lib", "app", "components"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      if (rel.startsWith(OWNER) || EXEMPT.includes(rel)) continue;
      for (const name of namedIn(await readFile(file, "utf8"))) offences.push(`${rel}: ${name}`);
    }
  }
  expect(offences, "hol den Pfad aus lib/session-store/recordings.ts (`recordingFile`)").toEqual([]);
});

test("Gegenprobe: der Erkenner sieht Pfad, Liste und einfache Anfuehrung, nicht Anzeige-Text", () => {
  expect(namedIn('path.join(dir, "log.jsonl")')).toEqual(["log.jsonl"]);
  expect(namedIn("['matte.jsonl', \"model-reads.jsonl\"]")).toEqual(["matte.jsonl", "model-reads.jsonl"]);
  expect(namedIn('<Fact label="reference.pgn">')).toEqual([]);
  expect(namedIn("// liest `candidate.json`")).toEqual([]);
});
