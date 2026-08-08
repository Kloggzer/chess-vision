/**
 * Board geometry, mirrored from `src/chesslab/calibration.py` — the ONLY thing shared with the
 * Python side is the arithmetic, and `warp.test.ts` pins it against a profile that side wrote.
 *
 * The quad is `[a8, h8, h1, a1]` in image pixels; `margin` says how far outside the playing
 * field those points sit (`compute_homography`). Everything here maps BOARD -> IMAGE, because
 * a warp samples the source for every destination pixel.
 */
export type Mat3 = number[];

/** Board-space corners of the marker quad — `compute_homography`'s `dst`, per-corner margins. */
function markerQuad(boardSize: number, margin: number | number[]): number[][] {
  const bs = boardSize;
  const [m0, m1, m2, m3] = (Array.isArray(margin) ? margin : [margin, margin, margin, margin]).map(
    (v) => v * bs,
  );
  return [
    [-m0, -m0],
    [bs + m1, -m1],
    [bs + m2, bs + m2],
    [-m3, bs + m3],
  ];
}

/** Four point pairs -> the 3x3 that maps `src` onto `dst` (Gauss with partial pivoting). */
export function perspectiveTransform(src: number[][], dst: number[][]): Mat3 {
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u, u]);
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error("degenerate quad");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= 8; c++) a[r][c] -= f * a[col][c];
    }
  }
  return [...Array.from({ length: 8 }, (_, i) => a[i][8] / a[i][i]), 1];
}

/** Board pixels -> image pixels for one frame's quad. */
export function boardToImage(corners: number[][], boardSize: number, margin: number | number[]) {
  return perspectiveTransform(markerQuad(boardSize, margin), corners);
}

export function applyMat(h: Mat3, x: number, y: number): [number, number] {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

const FILES = "abcdefgh";

/** 'e4' -> (col, row) in the rectified image, `_square_to_col_row`. */
export function squareColRow(square: string, whitePov = true): [number, number] {
  const sq = square.trim().toLowerCase();
  const col = FILES.indexOf(sq[0]);
  const rank = Number(sq[1]);
  if (sq.length !== 2 || col < 0 || !(rank >= 1 && rank <= 8)) throw new Error(`bad square: ${square}`);
  const row = 8 - rank;
  return whitePov ? [col, row] : [7 - col, 7 - row];
}

export type CropParams = { pad_up: number; pad_side: number };

/** 'e4' -> (x0, y0, x1, y1) in the rectified board image, `square_to_crop_box` (unclamped). */
export function squareCropBox(square: string, boardSize: number, crop: CropParams, whitePov = true) {
  const [col, row] = squareColRow(square, whitePov);
  const cell = boardSize / 8;
  return {
    x0: col * cell - crop.pad_side * cell,
    y0: row * cell - (crop.pad_side + crop.pad_up) * cell,
    x1: (col + 1) * cell + crop.pad_side * cell,
    y1: (row + 1) * cell + crop.pad_side * cell,
  };
}

export type Raster = { data: Buffer | Uint8Array; width: number; height: number; channels: number };

/**
 * Sample an axis-aligned BOARD-space box out of the raw frame through `h` (board -> image).
 *
 * Bilinear, edge-clamped; out-of-frame reads come back black. One destination pixel is one
 * source lookup — a wrong crop only mis-frames the human's picture, never the training data.
 */
export function sampleBox(
  src: Raster,
  h: Mat3,
  box: { x0: number; y0: number; x1: number; y1: number },
  outW: number,
  outH: number,
): Buffer {
  const out = Buffer.alloc(outW * outH * 3);
  const { data, width, height, channels } = src;
  for (let j = 0; j < outH; j++) {
    const by = box.y0 + ((j + 0.5) / outH) * (box.y1 - box.y0);
    for (let i = 0; i < outW; i++) {
      const bx = box.x0 + ((i + 0.5) / outW) * (box.x1 - box.x0);
      const [fx, fy] = applyMat(h, bx, by);
      if (fx < 0 || fy < 0 || fx > width - 1 || fy > height - 1) continue;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);
      const tx = fx - x0;
      const ty = fy - y0;
      const o = (j * outW + i) * 3;
      for (let c = 0; c < 3; c++) {
        const p00 = data[(y0 * width + x0) * channels + c];
        const p10 = data[(y0 * width + x1) * channels + c];
        const p01 = data[(y1 * width + x0) * channels + c];
        const p11 = data[(y1 * width + x1) * channels + c];
        out[o + c] =
          (p00 * (1 - tx) + p10 * tx) * (1 - ty) + (p01 * (1 - tx) + p11 * tx) * ty + 0.5;
      }
    }
  }
  return out;
}
