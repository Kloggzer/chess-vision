import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { cellPng } from "@/lib/crops";

const CANDIDATE = JSON.stringify({
  name: "g",
  clock: { fps: 25 },
  geometry: { board_size: 928 },
  moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
});

let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chesslab-crops-"));
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  await writeFile(path.join(root, "recordings", "g", "candidate.json"), CANDIDATE, "utf8");
  process.env.CHESSLAB_DATA_DIR = root;
});

async function write(row: object) {
  await writeFile(path.join(root, "recordings", "g", "log.jsonl"), JSON.stringify(row) + "\n", "utf8");
}

const ROW = { frame: "frames/000110.png", ply: 1, fen: "x", corners: [] };

// The `frames/` fallback is gone (2026-08-20): a row without a board used to serve a silent 404
// from a directory no recording has, so the cut has to say whose row is broken instead.
test("a row with no board names the recording and the stem", async () => {
  await write(ROW);
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/g\/000110: row carries no board/);
});

test("a board the export never wrote names the file it looked for", async () => {
  await write({ ...ROW, board: "boards/000110.webp", board_size: 1008, board_border: 40 });
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/board boards\/000110\.webp is missing/);
});
