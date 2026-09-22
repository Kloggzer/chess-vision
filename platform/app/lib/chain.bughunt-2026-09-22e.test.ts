/**
 * Die Kette zeigt EINEN Knopf, und sie liest ihn von der Platte ab. Jeder Lesefehler wurde zu
 * „der Schritt lief nie": ein unlesbares `log.jsonl` bot den Export erneut an, ein unlesbares
 * `candidate.json` schickte den Menschen ins Replay, und `exists` haette `adoptPgn` erlaubt,
 * eine vorhandene `reference.pgn` zu ueberschreiben.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((op: string, file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: string, file: string, rest: unknown[]) => {
    try {
      fail.on?.(name, String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real as unknown as Record<string, (...a: unknown[]) => unknown>)[name](file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
    readFile: (file: string, ...rest: unknown[]) => hop("readFile", file, rest),
  };
});

function blowUpOn(needle: string, code: string, ops = ["stat", "readdir", "readFile"]) {
  fail.on = (op, file) => {
    if (!ops.includes(op) || !file.includes(needle)) return;
    throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

beforeEach(() => {
  fail.on = null;
});

async function fixture(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  await writeSession({ root, rows: [{ frame: 1 }, { frame: 2 }], candidate: { confirmed: true } });
  await mkdir(path.join(root, "recordings", "g", "files", "games"), { recursive: true });
  return root;
}

const chainState = async () => (await import("@/lib/chain")).chainState("g");

test("ein unlesbares candidate.json ist keine Aufnahme ohne Zugfolge", async () => {
  await fixture("chaincand");
  blowUpOn("candidate.json", "EACCES", ["readFile"]);
  await expect(chainState()).rejects.toThrow(/EACCES/);
});

test("ein unlesbares log.jsonl ist keine ungeschnittene Aufnahme", async () => {
  await fixture("chainlog");
  blowUpOn("log.jsonl", "EMFILE", ["readFile"]);
  await expect(chainState()).rejects.toThrow(/EMFILE/);
});

test("ein I/O-Fehler am games-Verzeichnis ist kein „das Handy hat nichts aufgeschrieben\"", async () => {
  await fixture("chaingames");
  blowUpOn("games", "EACCES", ["readdir"]);
  await expect(chainState()).rejects.toThrow(/EACCES/);
});

test("ein unlesbares pass.json ist kein ungelaufener Sensor", async () => {
  const root = await fixture("chainpass");
  const dir = path.join(root, "reports", "temporal-mattes", "g");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "pass.json"), JSON.stringify({ _source: { log: "1:2" } }), "utf8");
  blowUpOn("pass.json", "EACCES", ["readFile"]);
  await expect(chainState()).rejects.toThrow(/EACCES/);
});

test("eine halb geschriebene pass.json bleibt toleriert", async () => {
  const root = await fixture("chainhalf");
  const dir = path.join(root, "reports", "temporal-mattes", "g");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "pass.json"), '{"_source": {"log"', "utf8");
  expect((await chainState()).hasTemporalPass).toBe(false);
});

test("ein I/O-Fehler auf reference.pgn darf das Urteil des Menschen nicht ueberschreiben", async () => {
  const root = await fixture("chainref");
  const game = path.join(root, "recordings", "g");
  await writeFile(path.join(game, "reference.pgn"), "1. e4 e5\n", "utf8");
  await writeFile(path.join(game, "files", "games", "a.pgn"), "1. d4 d5\n", "utf8");
  blowUpOn("reference.pgn", "EACCES", ["stat"]);
  const { adoptPgn } = await import("@/lib/chain");
  await expect(adoptPgn("g")).rejects.toThrow(/EACCES/);
  fail.on = null;
  const { readFile } = await import("node:fs/promises");
  expect(await readFile(path.join(game, "reference.pgn"), "utf8")).toBe("1. e4 e5\n");
});

test("und die gesunde Aufnahme nennt weiter ihren Schritt", async () => {
  await fixture("chainok");
  const state = await chainState();
  expect(state.hasCandidate).toBe(true);
  expect(state.hasSession).toBe(true);
});
