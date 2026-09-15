import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { medianPng } from "@/lib/crops";
import { type RowSpec, stemOf, tempDataRoot, writeSession } from "@/lib/test-fixtures";

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

beforeEach(async () => {
  const root = await tempDataRoot("median");
  const rows: RowSpec[] = Array.from({ length: FRAMES }, (_, i) => ({ frame: 100 + i, fen: "x" }));
  const dir = await writeSession({
    root,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows,
  });
  await mkdir(path.join(dir, "boards"), { recursive: true });
  for (let i = 0; i < FRAMES; i++) {
    const grey = BRIGHT.has(i) ? 250 : 10;
    const webp = await sharp({ create: { width: SIZE, height: SIZE, channels: 3,
      background: { r: grey, g: grey, b: grey } } }).webp({ lossless: true }).toBuffer();
    await writeFile(path.join(dir, "boards", `${stemOf(100 + i)}.webp`), webp);
  }
});

test("the median samples the whole ply interval, not only its front", async () => {
  const out = await medianPng("g", "000100", "e4", 8);
  const { data } = await sharp(out).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const mean = data.reduce((n, v) => n + v, 0) / data.length;
  expect(mean, "BUG: stride 2 over 14 frames — indices 9..13 are never sampled").toBeGreaterThan(128);
});
