/**
 * Der Nenner ist der Punkt: „1 von 43" darf nie als „1" lesbar werden. Ein Fehler an
 * `recordings/` lieferte eine LEERE Herkunftsliste, und `summarize` haette darauf null
 * Aufnahmen gemeldet — nicht „nicht gemessen", sondern „es gibt nichts".
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: "stat" | "readdir", file: string, rest: unknown[]) => {
    try {
      fail.on?.(String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
  };
});

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (!file.includes(needle)) return;
    throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

async function fixture(prefix: string): Promise<void> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "recordings", "g");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "model-reads.jsonl"), JSON.stringify({ _model: "p4a-80-clahe" }) + "\n{}\n", "utf8");
}

const provenance = async () => (await import("@/lib/provenance")).modelReadProvenance();

test("ein I/O-Fehler am Aufnahme-Verzeichnis ist kein leerer Korpus", async () => {
  await fixture("provdir");
  blowUpOn("recordings", "EACCES");
  await expect(provenance()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("ein I/O-Fehler auf model-reads.jsonl ist kein „nie gelesen\"", async () => {
  await fixture("provstat");
  blowUpOn("model-reads.jsonl", "EMFILE");
  await expect(provenance()).rejects.toThrow(/EMFILE/);
  fail.on = null;
});

test("und eine Aufnahme ohne Lesarten bleibt ungemessen, nicht null", async () => {
  await tempDataRoot("provleer");
  const root = process.env.CHESSLAB_DATA_DIR!;
  await mkdir(path.join(root, "recordings", "leer"), { recursive: true });
  fail.on = null;
  expect(await provenance()).toEqual([{ name: "leer", rows: null, probs: null, model: null, writtenAt: null }]);
});
