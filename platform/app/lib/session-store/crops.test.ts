import { mkdir, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test, vi } from "vitest";
import { boardPng, cellPng, mattePng, medianPng } from "@/lib/session-store/crops";
import { type RowSpec, stemOf, tempDataRoot, writeLog, writeSession } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

// Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  const hop = (op: Op) => (file: string, ...rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return { ...real, stat: hop("stat"), readFile: hop("readFile"), readdir: hop("readdir"), open: hop("open") };
});

/** Die Zeile des AUFRUFERS hinter der Tuer: dieselbe Datei fragen auch andere Module. */
const caller = () => (new Error().stack ?? "").split("\n").slice(1).find((l) => !/crops\.test|measurement/.test(l)) ?? "";

const MOVES = [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }];
const SIZE = 928;

let root: string;
let dir: string;

beforeEach(async () => {
  fail.on = null;
  root = await tempDataRoot("crops");
  dir = await writeSession({ root, moves: MOVES });
});

const write = (row: RowSpec) => writeLog(dir, [row]);

const ROW: RowSpec = { frame: 110, fen: "x" };

async function webp(side: number, grey = 0, lossless = false): Promise<Buffer> {
  return sharp({ create: { width: side, height: side, channels: 3, background: { r: grey, g: grey, b: grey } } })
    .webp({ lossless })
    .toBuffer();
}

async function board(stem: string, image: Buffer, sub = "boards"): Promise<string> {
  await mkdir(path.join(dir, sub), { recursive: true });
  const file = path.join(dir, sub, `${stem}.webp`);
  await writeFile(file, image);
  return file;
}

const meanOf = async (png: Buffer) => {
  const { data } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return data.reduce((n, v) => n + v, 0) / data.length;
};

// The `frames/` fallback is gone: a row without a board used to serve a silent 404.
test("a row with no board names the recording and the stem", async () => {
  await write({ ...ROW, board: false });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/g\/000110: row carries no board/);
});

test("a board the export never wrote names the file it looked for", async () => {
  await write({ ...ROW, boardSize: 1008, boardBorder: 40, straightened: false });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/board boards\/000110\.webp is missing/);
});

// An unstraightened board would put the lens bow back into every crop, silently.
test("a board that was never straightened is refused, not cut", async () => {
  await board("000110", await webp(8));
  await write({ ...ROW, boardBorder: 12, straightened: false });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/not straightened/);
});

// `mattePng` rief `rasterOf` direkt und legte ein Alpha auf genau das Brett, das `boardPng` ablehnt.
test("mattePng refuses an unstraightened board the board cut already refuses", async () => {
  await write({ ...ROW, boardSize: SIZE, straightened: false });
  await board("000110", await webp(SIZE));
  await board("000110", await webp(SIZE), "mattes");
  await expect(boardPng("g", "000110", 64)).rejects.toThrow(/not straightened/);
  await expect(mattePng("g", "000110", 64),
    "BUG: mattePng skips both of cutSource's guards").rejects.toThrow(/not straightened/);
});

// Die HINTERE Haelfte ist hell: ein Schnitt, der nur den Anfang trifft, bekommt einen dunklen Median.
test("the median samples the whole ply interval, not only its front", async () => {
  const frames = 14;
  await writeLog(dir, Array.from({ length: frames }, (_, i) => ({ frame: 100 + i, fen: "x" })));
  for (let i = 0; i < frames; i++) await board(stemOf(100 + i), await webp(SIZE, i >= 7 ? 250 : 10, true));
  const mean = await meanOf(await medianPng("g", "000100", "e4", 8));
  expect(mean, "BUG: stride 2 over 14 frames — indices 9..13 are never sampled").toBeGreaterThan(128);
});

// `rasterOf` cachte nach PFAD allein: der frische Schluessel bekam die vor dem Neuschreiben dekodierten Pixel.
test("a rewritten board is cut from its new pixels, not from the decoded old ones", async () => {
  await write({ ...ROW, boardSize: SIZE });
  const stamp = async (grey: number, when: number) => {
    const file = await board("000110", await webp(SIZE, grey, true));
    await utimes(file, new Date(when), new Date(when));
  };
  await stamp(10, Date.UTC(2026, 0, 1));
  expect(await meanOf(await cellPng("g", "000110", "e4", 8))).toBeLessThan(64);

  await stamp(250, Date.UTC(2026, 0, 2));
  const after = await meanOf(await cellPng("g", "000110", "e4", 8));
  expect(after, "BUG: rasterOf caches by path, so the fresh cache key gets stale pixels").toBeGreaterThan(192);
});

// Jeder `stat`-Fehler galt als „fehlt" oder mtime 0 — ein EACCES schickte in einen Re-Export.
test("ein EACCES am Brett ist kein fehlendes Brett", async () => {
  await write(ROW);
  fail.on = (op, file) => (op === "stat" && file.endsWith(path.join("boards", "000110.webp")) ? "EACCES" : null);
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/EACCES/);
});

const cell = async () => {
  await write(ROW);
  await board("000110", await webp(SIZE));
  return () => cellPng("g", "000110", "e4", 64);
};
const statFrom = (fn: string, tail: string, code: string) => (op: string, file: string) =>
  op === "stat" && file.endsWith(tail) && caller().includes(fn) ? code : null;

test("ein EMFILE auf candidate.json ist kein Schluessel „none\"", async () => {
  const cut = await cell();
  fail.on = statFrom("cellPng", "candidate.json", "EMFILE");
  await expect(cut()).rejects.toThrow(/EMFILE/);
});

test("ein EACCES auf log.jsonl ist keine mtime 0", async () => {
  const cut = await cell();
  fail.on = statFrom("cellPng", "log.jsonl", "EACCES");
  await expect(cut()).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf das Brett ist keine mtime 0 im Zellen-Schluessel", async () => {
  const cut = await cell();
  fail.on = statFrom("cellPng", path.join("boards", "000110.webp"), "EACCES");
  await expect(cut()).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf das Brett ist keine mtime 0 im Raster-Schluessel", async () => {
  const cut = await cell();
  fail.on = statFrom("rasterOf", path.join("boards", "000110.webp"), "EACCES");
  await expect(cut()).rejects.toThrow(/EACCES/);
});

test("mit lesbaren Dateien schneidet die Zelle weiter", async () => {
  const cut = await cell();
  expect((await cut()).length).toBeGreaterThan(0);
});
