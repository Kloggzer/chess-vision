/**
 * `cellPng` schluesselte seinen Cache auf `stat`-Antworten, die jeden Fehler zu `0`/"none" machten:
 * ein EMFILE auf `candidate.json` traf den Schnitt von VOR dem letzten Profil.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readFile: (f: string, ...r: unknown[]) => hop("readFile", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
    open: (f: string, ...r: unknown[]) => hop("open", f, r),
  };
});

beforeEach(() => {
  fail.on = null;
});

/** Die Zeile des AUFRUFERS hinter der Tuer: dieselbe Datei fragen auch andere Module. */
const caller = () => (new Error().stack ?? "").split("\n").slice(1).find((l) => !/bughunt-2026-09-23b|measurement/.test(l)) ?? "";

async function withBoard(prefix: string): Promise<void> {
  const dir = await writeSession({ root: await tempDataRoot(prefix), rows: [{ frame: 110 }] });
  await mkdir(path.join(dir, "boards"), { recursive: true });
  const board = sharp({ create: { width: 928, height: 928, channels: 3, background: "#000" } });
  await writeFile(path.join(dir, "boards", "000110.webp"), await board.webp().toBuffer());
}

const cell = async () => (await import("@/lib/crops")).cellPng("g", "000110", "e4", 64);
const statFrom = (fn: string, tail: string, code: string) => (op: string, file: string) =>
  op === "stat" && file.endsWith(tail) && caller().includes(fn) ? code : null;

test("ein EMFILE auf candidate.json ist kein Schluessel „none\"", async () => {
  await withBoard("cropskey");
  fail.on = statFrom("cellPng", "candidate.json", "EMFILE");
  await expect(cell()).rejects.toThrow(/EMFILE/);
});

test("ein EACCES auf log.jsonl ist keine mtime 0", async () => {
  await withBoard("cropslog");
  fail.on = statFrom("cellPng", "log.jsonl", "EACCES");
  await expect(cell()).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf das Brett ist keine mtime 0 im Zellen-Schluessel", async () => {
  await withBoard("cropsboard");
  fail.on = statFrom("cellPng", path.join("boards", "000110.webp"), "EACCES");
  await expect(cell()).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf das Brett ist keine mtime 0 im Raster-Schluessel", async () => {
  await withBoard("cropsraster");
  fail.on = statFrom("rasterOf", path.join("boards", "000110.webp"), "EACCES");
  await expect(cell()).rejects.toThrow(/EACCES/);
});

test("mit lesbaren Dateien schneidet die Zelle weiter", async () => {
  await withBoard("cropsok");
  expect((await cell()).length).toBeGreaterThan(0);
});
