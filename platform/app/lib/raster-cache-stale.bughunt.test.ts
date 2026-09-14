import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { cellPng } from "@/lib/crops";

/**
 * `cellPng` keys its encoded cache by the board's mtime because `session boards` rewrites the
 * board file. On that miss it still goes through `rasterOf`, whose cache is keyed by PATH ALONE —
 * so the fresh key is filled with pixels decoded before the rewrite, and the stale crop then looks
 * authoritative.
 */
const SIZE = 928;
let dir: string;

async function board(grey: number, when: number): Promise<void> {
  const webp = await sharp({ create: { width: SIZE, height: SIZE, channels: 3,
    background: { r: grey, g: grey, b: grey } } }).webp({ lossless: true }).toBuffer();
  const file = path.join(dir, "boards", "000100.webp");
  await writeFile(file, webp);
  await utimes(file, new Date(when), new Date(when));
}

const mean = async (png: Buffer) => {
  const { data } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return data.reduce((n, v) => n + v, 0) / data.length;
};

beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-raster-"));
  dir = path.join(root, "recordings", "g");
  await mkdir(path.join(dir, "boards"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
  await writeFile(path.join(dir, "candidate.json"),
    JSON.stringify({ name: "g", clock: { fps: 25 }, geometry: { board_size: SIZE },
      moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }] }), "utf8");
  await writeFile(path.join(dir, "log.jsonl"),
    JSON.stringify({ frame: "frames/000100.png", ply: 1, fen: "x", corners: [],
      board: "boards/000100.webp", board_size: SIZE, board_border: 0, board_straightened: true }) + "\n",
    "utf8");
});

test("a rewritten board is cut from its new pixels, not from the decoded old ones", async () => {
  await board(10, Date.UTC(2026, 0, 1));
  expect(await mean(await cellPng("g", "000100", "e4", 8))).toBeLessThan(64);

  await board(250, Date.UTC(2026, 0, 2));
  const after = await mean(await cellPng("g", "000100", "e4", 8));
  expect(after, "BUG: rasterOf caches by path, so the fresh cache key gets stale pixels").toBeGreaterThan(192);
});
