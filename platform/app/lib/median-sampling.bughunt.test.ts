import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { medianPng } from "@/lib/crops";

/**
 * `Math.floor(stems.length / SAMPLES)` makes the stride too short and `.slice(0, SAMPLES)` then
 * truncates from the FRONT: a 14-frame interval is sampled at 0,2,4,6,8 and the back five frames
 * never reach the median the comment says spreads over the whole interval.
 */
const FRAMES = 14;
// Die HINTERE Haelfte ist hell: ein Schnitt, der nur den Anfang trifft, bekommt einen dunklen
// Median, jeder der das Ende erreicht einen hellen. Das ist die Eigenschaft, nicht eine
// bestimmte Schrittweite.
const BRIGHT = new Set([7, 8, 9, 10, 11, 12, 13]);
const SIZE = 928;

let root: string;
let dir: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chesslab-median-"));
  dir = path.join(root, "recordings", "g");
  await mkdir(path.join(dir, "boards"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;

  await writeFile(
    path.join(dir, "candidate.json"),
    JSON.stringify({ name: "g", clock: { fps: 25 }, geometry: { board_size: SIZE },
      moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }] }),
    "utf8",
  );

  const lines: string[] = [];
  for (let i = 0; i < FRAMES; i++) {
    const stem = String(100 + i).padStart(6, "0");
    const grey = BRIGHT.has(i) ? 250 : 10;
    const webp = await sharp({ create: { width: SIZE, height: SIZE, channels: 3,
      background: { r: grey, g: grey, b: grey } } }).webp({ lossless: true }).toBuffer();
    await writeFile(path.join(dir, "boards", `${stem}.webp`), webp);
    lines.push(JSON.stringify({ frame: `frames/${stem}.png`, ply: 1, fen: "x", corners: [],
      board: `boards/${stem}.webp`, board_size: SIZE, board_border: 0, board_straightened: true }));
  }
  await writeFile(path.join(dir, "log.jsonl"), lines.join("\n") + "\n", "utf8");
});

test("the median samples the whole ply interval, not only its front", async () => {
  const out = await medianPng("g", "000100", "e4", 8);
  const { data } = await sharp(out).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((n, v) => n + v, 0) / data.length;
  expect(mean, "BUG: stride 2 over 14 frames — indices 9..13 are never sampled").toBeGreaterThan(128);
});
