/**
 * Wer eine `.json`/`.jsonl` selbst schreibt, beantwortet den Abbruch mitten im Schreiben neu —
 * und beim Anhaengen den abgerissenen Schwanz. `lib/atomic.ts` ist die eine Antwort; diese Liste
 * sind die Stellen davor und darf nur SCHRUMPFEN. Der Zwilling zu `tests/test_json_doors.py`.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const ROOT = path.join(__dirname, "..");
const LEDGER = path.join(ROOT, "write-doors.txt");
const CUSTODIAN = "lib/atomic.ts";
/** Die vier Schreibweisen, in denen diese App eine Datei anlegt — `writeFileAtomic(` faellt raus. */
const WRITE = /\b(writeFile|appendFile|writeFileSync|appendFileSync)\(/;
const JSONISH = /JSON\.stringify\(|\.jsonl?["'`]/;
/** Ein Log, das nur ein Mensch liest, ist keine Datei, um die sich zwei Prozesse streiten. */
const NOT_JSON = /\.(log|txt|pgn|csv|webp|png)["'`]/;

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

/** Schreibaufruf UND JSON in derselben Sichtweite — das ist die Form, die die Politik neu erfindet. */
async function doors(): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  for (const dir of ["lib", "app"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      const rel = path.relative(ROOT, file).split(path.sep).join("/");
      // Ein Test legt sein eigenes Fixture an; das ist keine Schreibpolitik.
      if (rel === CUSTODIAN || /\.test\.tsx?$/.test(rel)) continue;
      const lines = (await readFile(file, "utf8")).split("\n");
      const hits = lines.filter(
        (line, i) => WRITE.test(line) && !NOT_JSON.test(line) && JSONISH.test(lines.slice(i, i + 6).join("\n")),
      ).length;
      if (hits > 0) found.set(rel, hits);
    }
  }
  return found;
}

async function ledger(): Promise<Map<string, number>> {
  const text = await readFile(LEDGER, "utf8");
  return new Map(
    text.split(/\r?\n/).map((l) => l.split("#")[0].trim()).filter(Boolean)
      .map((l) => [l.split(/\s+/)[1], Number(l.split(/\s+/)[0])] as [string, number]),
  );
}

test("keine neue Tuer am Treuhaender vorbei", async () => {
  const seen = await doors();
  const known = await ledger();
  const fresh = [...seen.keys()].filter((f) => !known.has(f)).sort();
  expect(fresh, "schreib ueber lib/atomic.ts").toEqual([]);
});

test("eine bekannte Tuer wird nicht breiter", async () => {
  const seen = await doors();
  for (const [file, budget] of await ledger()) {
    expect(seen.get(file) ?? 0, file).toBeLessThanOrEqual(budget);
  }
});

test("die Liste traegt keine erledigte Zeile mehr", async () => {
  const seen = await doors();
  const stale = [...(await ledger())].filter(([f, n]) => (seen.get(f) ?? 0) < n);
  expect(stale, "schreib die Zahl herunter — die Ratsche darf nur schrumpfen").toEqual([]);
});
