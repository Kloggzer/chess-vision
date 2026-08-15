import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";
import {
  boardToImage,
  type GridMesh,
  meshFromLines,
  meshPoint,
  squareColRow,
  squareCropBox,
  squareMeshBox,
  squareMeshQuad,
  type TiltedMesh,
} from "@/lib/warp";

/**
 * Truth from the Python side: `data/calibration/desktop.yaml`, written by `chesslab calibrate`
 * for the rec-20260808-003957 recording. `image_corners` + margin 0.045 + board 928 produced
 * `homography` (IMAGE -> board); `boardToImage` is its inverse, so board -> image -> board must
 * come back to where it started. That is the only calibration this geometry gets.
 */
const CORNERS = [
  [560.4562377929688, 73.46708679199219],
  [1469.7095947265625, 80.20635223388672],
  [1486.64892578125, 982.4928588867188],
  [564.5195922851562, 1001.9081420898438],
];
const IMAGE_TO_BOARD = [
  [1.0656515991094548, -0.005314724019413451, -637.9599380418696],
  [-0.006799568144233765, 1.0873896412770145, -117.17579806941065],
  [-3.0289393142337808e-5, 1.5718358099405127e-5, 1.0],
];

function toBoard(x: number, y: number): [number, number] {
  const [a, b, c] = IMAGE_TO_BOARD;
  const w = c[0] * x + c[1] * y + c[2];
  return [(a[0] * x + a[1] * y + a[2]) / w, (b[0] * x + b[1] * y + b[2]) / w];
}

test("board -> image agrees with the profile chesslab calibrate wrote", () => {
  const h = boardToImage(CORNERS, 928, 0.045);
  for (const [bx, by] of [
    [0, 0],
    [928, 0],
    [464, 464],
    [116 * 4.5, 116 * 6.5], // the centre of e2
    [928, 928],
  ]) {
    const w = h[6] * bx + h[7] * by + h[8];
    const ix = (h[0] * bx + h[1] * by + h[2]) / w;
    const iy = (h[3] * bx + h[4] * by + h[5]) / w;
    const [rx, ry] = toBoard(ix, iy);
    expect(rx).toBeCloseTo(bx, 3);
    expect(ry).toBeCloseTo(by, 3);
  }
});

test("the crop box is square_to_crop_box, pads included", () => {
  expect(squareColRow("a8")).toEqual([0, 0]);
  expect(squareColRow("h1")).toEqual([7, 7]);
  expect(squareColRow("a8", false)).toEqual([7, 7]);
  // board 928 -> cell 116, pad_side 0.05 -> a 127.6 px box, the phone/desktop profile's number.
  const box = squareCropBox("a8", 928, { pad_up: 0, pad_side: 0.05 });
  for (const [got, want] of [
    [box.x0, -5.8],
    [box.y0, -5.8],
    [box.x1, 121.8],
    [box.y1, 121.8],
  ]) {
    expect(got).toBeCloseTo(want, 9);
  }
  const e2 = squareCropBox("e2", 928, { pad_up: 0, pad_side: 0 });
  expect([e2.x0, e2.y0]).toEqual([464, 696]);
});

/** The SAME fixture `MeshCropParityTest.kt` pins `meshCropBoxExact` on — one file, two readers. */
const MESH_FIXTURE = JSON.parse(
  readFileSync(
    path.join(
      __dirname,
      "../../../android/core-engine/src/test/resources/parity/_geometry/mesh_crop_parity.json",
    ),
    "utf8",
  ),
) as {
  boardSize: number;
  padSide: number;
  padUp: number;
  whitePov: boolean;
  mesh: Required<GridMesh>;
  boxes: Record<string, number[]>;
  quads: Record<string, number[][]>;
  curvedQuads: Record<string, number[][]>;
};

const LINEAR_MESH: TiltedMesh = {
  x: MESH_FIXTURE.mesh.x,
  y: MESH_FIXTURE.mesh.y,
  tx: MESH_FIXTURE.mesh.tx,
  ty: MESH_FIXTURE.mesh.ty,
};

test("squareMeshBox cuts the Kotlin fixture's rectangles on all 64 squares", () => {
  const crop = { pad_side: MESH_FIXTURE.padSide, pad_up: MESH_FIXTURE.padUp };
  expect(Object.keys(MESH_FIXTURE.boxes).length).toBe(64);
  for (const [square, [x0, y0, x1, y1]] of Object.entries(MESH_FIXTURE.boxes)) {
    const box = squareMeshBox(square, MESH_FIXTURE.boardSize, MESH_FIXTURE.mesh, crop, MESH_FIXTURE.whitePov);
    expect(box.x0, `${square}.x0`).toBeCloseTo(x0, 9);
    expect(box.y0, `${square}.y0`).toBeCloseTo(y0, 9);
    expect(box.x1, `${square}.x1`).toBeCloseTo(x1, 9);
    expect(box.y1, `${square}.y1`).toBeCloseTo(y1, 9);
  }
});

test("squareMeshQuad hits the Kotlin fixture's four source points on all 64 squares", () => {
  const crop = { pad_side: MESH_FIXTURE.padSide, pad_up: MESH_FIXTURE.padUp };
  for (const [name, mesh] of [
    ["quads", LINEAR_MESH],
    ["curvedQuads", MESH_FIXTURE.mesh],
  ] as const) {
    const wanted = MESH_FIXTURE[name];
    expect(Object.keys(wanted).length).toBe(64);
    for (const [square, want] of Object.entries(wanted)) {
      const got = squareMeshQuad(square, MESH_FIXTURE.boardSize, mesh, crop, MESH_FIXTURE.whitePov);
      for (let corner = 0; corner < 4; corner++) {
        expect(got[corner][0], `${name} ${square}[${corner}].x`).toBeCloseTo(want[corner][0], 9);
        expect(got[corner][1], `${name} ${square}[${corner}].y`).toBeCloseTo(want[corner][1], 9);
      }
    }
  }
});

test("zero tilts put the quad's corners on the scalar box", () => {
  const crop = { pad_side: MESH_FIXTURE.padSide, pad_up: MESH_FIXTURE.padUp };
  const flat = { ...LINEAR_MESH, tx: Array(9).fill(0), ty: Array(9).fill(0) };
  const box = squareMeshBox("e4", MESH_FIXTURE.boardSize, flat, crop);
  const quad = squareMeshQuad("e4", MESH_FIXTURE.boardSize, flat, crop);
  expect(quad[0]).toEqual([box.x0, box.y0]);
  expect(quad[2]).toEqual([box.x1, box.y1]);
});

test("the nominal mesh reproduces squareCropBox", () => {
  const nominal = { x: [...Array(9)].map((_, k) => k / 8), y: [...Array(9)].map((_, k) => k / 8) };
  for (const square of ["a8", "e4", "h1", "a1", "d5"]) {
    const want = squareCropBox(square, 928, { pad_up: 0.25, pad_side: 0.05 });
    const got = squareMeshBox(square, 928, nominal, { pad_up: 0.25, pad_side: 0.05 });
    for (const key of ["x0", "y0", "x1", "y1"] as const) {
      expect(got[key], `${square}.${key}`).toBeCloseTo(want[key], 9);
    }
  }
});

test("a mesh point at a crossing IS that crossing — the cell quads and the board agree", () => {
  // Both solvers iterate to the same crossing from different seeds, so they agree to their own
  // residual, not to the last bit — a hundredth of a pixel on a 928 board.
  const crop = { pad_side: 0, pad_up: 0 };
  for (const [square, k, l] of [["a8", 0, 0], ["e4", 4, 4], ["h1", 7, 7], ["c6", 2, 2]] as const) {
    const [tl] = squareMeshQuad(square, MESH_FIXTURE.boardSize, MESH_FIXTURE.mesh, crop);
    const [x, y] = meshPoint(k / 8, l / 8, MESH_FIXTURE.mesh);
    expect(Math.abs(x * MESH_FIXTURE.boardSize - tl[0]), `${square}.x`).toBeLessThan(0.01);
    expect(Math.abs(y * MESH_FIXTURE.boardSize - tl[1]), `${square}.y`).toBeLessThan(0.01);
  }
});

test("a nominal mesh moves no pixel — the board warp falls back to itself", () => {
  const axis = [...Array(9)].map((_, k) => k / 8);
  const flat = { x: axis, y: axis, tx: Array(9).fill(0), ty: Array(9).fill(0) };
  for (const [u, v] of [[0, 0], [0.5, 0.5], [0.31, 0.77], [1, 1]]) {
    const [x, y] = meshPoint(u, v, flat);
    expect(x).toBeCloseTo(u, 9);
    expect(y).toBeCloseTo(v, 9);
  }
});

test("meshFromLines drops one stage per defect", () => {
  const m = MESH_FIXTURE.mesh;
  expect(meshFromLines(m)!.cx).toEqual(m.cx);
  // Over its limit, so the curvature pair goes and the tilts stay.
  expect(meshFromLines({ ...m, cx: Array(9).fill(0.2) })!.cx).toBeUndefined();
  expect(meshFromLines({ ...m, cx: Array(9).fill(0.2) })!.tx).toEqual(m.tx);
  expect(meshFromLines({ ...m, tx: Array(9).fill(0.9) })!.tx).toBeUndefined();
  expect(meshFromLines({ ...m, ty: m.ty.slice(0, 8) })!.ty).toBeUndefined();
  expect(meshFromLines({ ...m, x: [...m.x].reverse() })).toBeUndefined();
  expect(meshFromLines({ ...m, y: m.y.map(String) })).toBeUndefined();
  expect(meshFromLines(undefined)).toBeUndefined();
});

test("fen labels cover all 64 squares", () => {
  const labels = fenLabels("rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
  expect(Object.keys(labels).length).toBe(64);
  expect(labels.a8).toBe("bR");
  expect(labels.e3).toBe("wP");
  expect(labels.e2).toBe("empty");
  expect(labels.d1).toBe("wQ");
});
