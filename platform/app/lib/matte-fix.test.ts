import { expect, test } from "vitest";
import { applyAlphaMask } from "@/lib/matte-fix";
import { type TiltedMesh, meshPoint } from "@/lib/warp";

const grey = (side: number, fill: number) => ({
  data: new Uint8Array(side * side).fill(fill),
  width: side,
  height: side,
});

/** RGBA, `{[x,y]: "up" | "down"}` — what the pen's canvas hands over as a PNG. */
function mask(side: number, hits: Record<string, "up" | "down">) {
  const data = new Uint8Array(side * side * 4);
  for (const [at, kind] of Object.entries(hits)) {
    const [x, y] = at.split(",").map(Number);
    const o = (y * side + x) * 4;
    data[o + (kind === "up" ? 0 : 1)] = 255;
    if (kind === "down") data[o + 2] = 255;
    data[o + 3] = 255;
  }
  return { data, width: side, height: side };
}

const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

test("a stroke raises the alpha, an eraser drops it, the rest stays SAM's", () => {
  const out = applyAlphaMask({
    alpha: grey(8, 90),
    mask: mask(8, { "2,3": "up", "5,1": "down" }),
    h: IDENTITY,
    boardSize: 8,
  });
  expect(out[3 * 8 + 2]).toBe(255);
  expect(out[1 * 8 + 5]).toBe(0);
  expect(out[0]).toBe(90);
});

test("the mask is read through the stored raster's own scale and border", () => {
  // `boardToStored`: the board is drawn at 2x inside a 4 px border, so board (2,3) is pixel (8,10).
  const out = applyAlphaMask({
    alpha: grey(24, 10),
    mask: mask(8, { "2,3": "up" }),
    h: [2, 0, 4, 0, 2, 4, 0, 0, 1],
    boardSize: 8,
  });
  expect(out[10 * 24 + 8]).toBe(255);
  expect(out[10 * 24 + 9]).toBe(255);
  expect(out[3 * 24 + 2]).toBe(10);
});

test("with a mesh the stroke lands where the board's own lines put the square", () => {
  const axis = [0, 0.13, 0.25, 0.37, 0.5, 0.62, 0.75, 0.87, 1];
  const mesh: TiltedMesh = { x: axis, y: axis, tx: Array(9).fill(0.02), ty: Array(9).fill(-0.03) };
  const side = 64;
  const out = applyAlphaMask({
    alpha: grey(side, 30),
    mask: mask(side, { "20,40": "up" }),
    h: IDENTITY,
    boardSize: side,
    mesh,
  });
  // The painted cell of the STRAIGHTENED view sits on the measured board where meshPoint says.
  const [mx, my] = meshPoint(20.5 / side, 40.5 / side, mesh);
  const x = Math.round(mx * side - 0.5);
  const y = Math.round(my * side - 0.5);
  expect(out[y * side + x]).toBe(255);
  expect(out.filter((v) => v === 255).length).toBeGreaterThan(0);
  expect(out[0]).toBe(30);
});
