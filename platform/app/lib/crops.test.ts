import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { cellPng } from "@/lib/crops";
import { type RowSpec, tempDataRoot, writeLog, writeSession } from "@/lib/test-fixtures";

const MOVES = [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }];

let root: string;
let dir: string;

beforeEach(async () => {
  root = await tempDataRoot("crops");
  dir = await writeSession({ root, moves: MOVES });
});

const write = (row: RowSpec) => writeLog(dir, [row]);

const ROW: RowSpec = { frame: 110, fen: "x" };

// The `frames/` fallback is gone (2026-08-20): a row without a board used to serve a silent 404
// from a directory no recording has, so the cut has to say whose row is broken instead.
test("a row with no board names the recording and the stem", async () => {
  await write({ ...ROW, board: false });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/g\/000110: row carries no board/);
});

test("a board the export never wrote names the file it looked for", async () => {
  await write({ ...ROW, boardSize: 1008, boardBorder: 40, straightened: false });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/board boards\/000110\.webp is missing/);
});

// The bow comes out of the STORE now, once. A board that skipped that would put it back into
// every crop and nothing on screen would say so — hence a refusal rather than a silent cut.
test("a board that was never straightened is refused, not cut", async () => {
  await mkdir(path.join(dir, "boards"), { recursive: true });
  const png = await sharp({
    create: { width: 8, height: 8, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .webp()
    .toBuffer();
  await writeFile(path.join(dir, "boards", "000110.webp"), png);
  await write({ ...ROW, boardBorder: 12, straightened: false });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/not straightened/);
});
