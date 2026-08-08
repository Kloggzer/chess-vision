import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";
import { boardToImage, squareColRow, squareCropBox } from "@/lib/warp";

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

test("fen labels cover all 64 squares", () => {
  const labels = fenLabels("rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1");
  expect(Object.keys(labels).length).toBe(64);
  expect(labels.a8).toBe("bR");
  expect(labels.e3).toBe("wP");
  expect(labels.e2).toBe("empty");
  expect(labels.d1).toBe("wQ");
});
