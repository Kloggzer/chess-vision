import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";
import {
  applyMat,
  boardToImage,
  type GridMesh,
  invertMat,
  meshFromLines,
  meshPoint,
  meshPointInverse,
  squareColRow,
  squareCropBox,
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

/** The SAME fixture `MeshPointParityTest.kt` pins `meshPoint` on — one file, three readers. */
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
  meshPoints: number[][];
  curvedMeshPoints: number[][];
};

const LINEAR_MESH: TiltedMesh = {
  x: MESH_FIXTURE.mesh.x,
  y: MESH_FIXTURE.mesh.y,
  tx: MESH_FIXTURE.mesh.tx,
  ty: MESH_FIXTURE.mesh.ty,
};

test.each([
  ["meshPoints", LINEAR_MESH],
  ["curvedMeshPoints", MESH_FIXTURE.mesh],
] as const)("%s map exactly as the shared fixture says", (key, mesh) => {
  const rows = MESH_FIXTURE[key];
  expect(rows.length).toBe(100);
  for (const [u, v, wx, wy] of rows) {
    const [x, y] = meshPoint(u, v, mesh);
    expect(x, `x at (${u}, ${v})`).toBeCloseTo(wx, 9);
    expect(y, `y at (${u}, ${v})`).toBeCloseTo(wy, 9);
  }
});

// The scalar stage: offsets without tilts are still a correction, and a map that refused them
// would drop it silently — the very kind of quiet loss the per-cell cut used to hide.
test("a mesh without tilts moves a point by its offsets alone", () => {
  const shifted = [...Array(9)].map((_, k) => k / 8 + 0.01);
  const [x, y] = meshPoint(0.5, 0.5, { x: shifted, y: [...shifted] });
  expect(x).toBeCloseTo(0.51, 9);
  expect(y).toBeCloseTo(0.51, 9);
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

test("invertMat undoes boardToImage, corners and centre alike", () => {
  const h = boardToImage(CORNERS, 928, 0.045);
  const inv = invertMat(h);
  for (const [bx, by] of [[0, 0], [928, 0], [464, 464], [928, 928], [-40, 970]]) {
    const [ix, iy] = applyMat(h, bx, by);
    const [rx, ry] = applyMat(inv, ix, iy);
    expect(rx).toBeCloseTo(bx, 6);
    expect(ry).toBeCloseTo(by, 6);
  }
});

test("meshPointInverse lands back on the ideal point meshPoint came from", () => {
  for (const mesh of [LINEAR_MESH, MESH_FIXTURE.mesh as TiltedMesh]) {
    for (let u = 0.02; u < 1; u += 0.11) {
      for (let v = 0.03; v < 1; v += 0.13) {
        const [mx, my] = meshPoint(u, v, mesh);
        const [ru, rv] = meshPointInverse(mx, my, mesh);
        // Sub-pixel on a 720 px board is the bar: a stroke may not slide off what was painted.
        expect(Math.abs(ru - u) * 720).toBeLessThan(0.5);
        expect(Math.abs(rv - v) * 720).toBeLessThan(0.5);
      }
    }
  }
});
