/**
 * H2: `/corpus` zeichnet den Pool als gemessene Zahl. `recordingNames` machte aus JEDEM
 * `readdir`-Fehler `[]` und `keyedLogs` aus jedem `stat`-Fehler ein „keine Datei", also
 * uebersprungen — ein EMFILE unter dem Aufnahme-Faecher nahm die Aufnahme (oder den ganzen
 * Korpus) lautlos aus der Rechnung. Dieselbe Wurzel wie `stampOrMissing`, dieselbe Tuer.
 */
import { expect, test, vi } from "vitest";
import { writeSession, tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: "stat" | "readdir", file: string, rest: unknown[]) => {
    try {
      fail.on?.(file);
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
    const error = Object.assign(new Error(`${code}: ${file}`), { code });
    throw error;
  };
}

async function freshPool() {
  delete (globalThis as { __chesslabPool?: unknown }).__chesslabPool;
  return (await import("@/lib/pool")).loadPool();
}

test("ein I/O-Fehler auf log.jsonl ist keine Aufnahme ohne Zellen", async () => {
  const root = await tempDataRoot("poolstat");
  await writeSession({ root, rows: [{ frame: 234 }, { frame: 237 }] });
  blowUpOn("log.jsonl", "EMFILE");
  await expect(freshPool()).rejects.toThrow(/EMFILE/);
  fail.on = null;
});

test("ein I/O-Fehler auf dem Aufnahme-Verzeichnis ist kein leerer Korpus", async () => {
  const root = await tempDataRoot("poolreaddir");
  await writeSession({ root, rows: [{ frame: 234 }] });
  blowUpOn("recordings", "EACCES");
  await expect(freshPool()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("und eine fehlende Aufnahme bleibt ein leerer Korpus, ohne Fehler", async () => {
  await tempDataRoot("poolleer");
  fail.on = null;
  const pool = await freshPool();
  expect(pool.cells).toBe(0);
  expect(pool.frames).toBe(0);
});

test("der gesunde Fall zaehlt weiter 64 Zellen je Frame", async () => {
  const root = await tempDataRoot("poolok");
  await writeSession({ root, rows: [{ frame: 234 }, { frame: 237 }] });
  fail.on = null;
  const pool = await freshPool();
  expect(pool.frames).toBe(2);
  expect(pool.cells).toBe(128);
});
