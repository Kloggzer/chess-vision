import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { boardPng, mattePng } from "@/lib/crops";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/**
 * `cutSource` refuses a board the store never straightened, because cutting it would put the lens
 * bow back into every crop silently. `mattePng` reuses the same `boardToStored` geometry but calls
 * `rasterOf` directly, so it overlays an alpha on exactly the board `boardPng` refuses.
 */
const SIZE = 928;
let dir: string;

beforeEach(async () => {
  const root = await tempDataRoot("mattepng");
  dir = await writeSession({
    root, boardSize: SIZE,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [{ frame: 100, fen: "x", boardSize: SIZE, straightened: false }],
  });
  await mkdir(path.join(dir, "boards"), { recursive: true });
  await mkdir(path.join(dir, "mattes"), { recursive: true });
  const webp = await sharp({ create: { width: SIZE, height: SIZE, channels: 3,
    background: { r: 0, g: 0, b: 0 } } }).webp().toBuffer();
  await writeFile(path.join(dir, "boards", "000100.webp"), webp);
  await writeFile(path.join(dir, "mattes", "000100.webp"), webp);
});

test("mattePng refuses an unstraightened board the board cut already refuses", async () => {
  await expect(boardPng("g", "000100", 64)).rejects.toThrow(/not straightened/);
  await expect(mattePng("g", "000100", 64),
    "BUG: mattePng skips both of cutSource's guards").rejects.toThrow(/not straightened/);
});
