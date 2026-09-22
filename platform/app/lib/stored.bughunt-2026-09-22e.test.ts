/**
 * Die Stored-Sitzungen des Telefons sind der einzige Ort, an dem seine Labels liegen. Jeder
 * Fehler am `sessions/`-Verzeichnis, an `log.jsonl` oder am `quad-fit.json` wurde zu „gibt es
 * nicht" — die Sitzung verschwand aus der Liste, oder ihre Crops fielen auf die Markerecken
 * zurueck, ohne dass irgendwo etwas rot wurde.
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

const row = JSON.stringify({ frame: "frames/000001.jpg", ply: 1, fen: "8/8/8/8/8/8/8/8", corners: [[0, 0], [1, 0], [1, 1], [0, 1]] });

async function fixture(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const session = path.join(root, "recordings", "g", "files", "sessions", "s1");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "log.jsonl"), row + "\n", "utf8");
  await writeFile(path.join(session, "quad-fit.json"), JSON.stringify({ margin: 0.045, frames: {} }), "utf8");
  return session;
}

const sessions = async () => (await import("@/lib/stored")).storedSessions("g");

test("ein I/O-Fehler am sessions-Verzeichnis ist kein Bundle ohne Sitzungen", async () => {
  await fixture("storeddir");
  blowUpOn("sessions", "EACCES");
  await expect(sessions()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("ein I/O-Fehler auf log.jsonl ist keine fehlende Sitzung", async () => {
  await fixture("storedlog");
  blowUpOn("log.jsonl", "EMFILE");
  await expect(sessions()).rejects.toThrow(/EMFILE/);
  fail.on = null;
});

test("ein I/O-Fehler auf quad-fit.json ist kein ungelaufener Fit", async () => {
  const session = await fixture("storedfit");
  blowUpOn("quad-fit.json", "EACCES");
  const { storedFit } = await import("@/lib/stored");
  await expect(storedFit(session)).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("und ohne Bundle bleibt die Liste leer, mit Bundle traegt sie ihre Zeile", async () => {
  await tempDataRoot("storedleer");
  fail.on = null;
  expect(await sessions()).toEqual([]);
  await fixture("storedok");
  const found = await sessions();
  expect(found.map((s) => s.rows.length)).toEqual([1]);
});
