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
function perspectiveTransform(src: number[][], dst: number[][]): Mat3 {
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

/** The inverse of a board->image 3x3 — the adjugate; the scale cancels in `applyMat`. */
export function invertMat(h: Mat3): Mat3 {
  const c = [
    h[4] * h[8] - h[5] * h[7], h[5] * h[6] - h[3] * h[8], h[3] * h[7] - h[4] * h[6],
    h[2] * h[7] - h[1] * h[8], h[0] * h[8] - h[2] * h[6], h[1] * h[6] - h[0] * h[7],
    h[1] * h[5] - h[2] * h[4], h[2] * h[3] - h[0] * h[5], h[0] * h[4] - h[1] * h[3],
  ];
  const det = h[0] * c[0] + h[1] * c[1] + h[2] * c[2];
  if (Math.abs(det) < 1e-12) throw new Error("singular matrix");
  return [c[0], c[3], c[6], c[1], c[4], c[7], c[2], c[5], c[8]].map((v) => v / det);
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

export type CropParams = { pad_side: number };

/** 'e4' -> (x0, y0, x1, y1) in the rectified board image, `square_to_crop_box` (unclamped). */
export function squareCropBox(square: string, boardSize: number, crop: CropParams, whitePov = true) {
  const [col, row] = squareColRow(square, whitePov);
  const cell = boardSize / 8;
  return {
    x0: col * cell - crop.pad_side * cell,
    y0: row * cell - crop.pad_side * cell,
    x1: (col + 1) * cell + crop.pad_side * cell,
    y1: (row + 1) * cell + crop.pad_side * cell,
  };
}

/** The 18 measured grid lines as fractions of the field side (`quad-fit.json` `grid_lines`);
 *  `tx`/`ty` are their dimensionless tilts about the board centre, `cx`/`cy` their parabola
 *  terms — each pair complete or absent, curvature only on top of tilts. */
export type GridMesh = { x: number[]; y: number[]; tx?: number[]; ty?: number[]; cx?: number[]; cy?: number[] };

/** A mesh whose tilt stage is proven present; curvature may still be absent. */
export type TiltedMesh = GridMesh & { tx: number[]; ty: number[] };

/** A steeper line is a misfit, not a lens — shared with realgames.py and CropBox.kt. */
const MESH_TILT_LIMIT = 0.05;

/** The same for the parabola term — realgames.py `MESH_CURV_LIMIT` explains the number. */
const MESH_CURV_LIMIT = 0.08;

/** 9 finite, strictly increasing numbers — anything else reads as "no mesh", never as an error. */
const meshAxis = (axis: unknown): axis is number[] =>
  Array.isArray(axis) &&
  axis.length === 9 &&
  axis.every((v, i) => Number.isFinite(v) && (i === 0 || v > (axis[i - 1] as number)));

/** 9 finite values under a shared limit; malformed drops ONE stage, never half an axis pair. */
const boundedAxis = (axis: unknown, limit: number): axis is number[] =>
  Array.isArray(axis) && axis.length === 9 && axis.every((v) => Number.isFinite(v) && Math.abs(v) < limit);

/**
 * `grid_lines` (a sidecar's or a session row's) -> the strongest stage it carries: curved, tilted,
 * scalar, or nothing. Additive by construction, so a malformed pair costs exactly one stage and a
 * bad file can never take a page down. Twins: `mesh_from_lines` (calibration.py), `meshOrNull`
 * (LabeledVideoPack.kt).
 */
export function meshFromLines(lines: unknown): GridMesh | undefined {
  const l = lines as Partial<GridMesh> | null | undefined;
  if (!l || !meshAxis(l.x) || !meshAxis(l.y)) return undefined;
  if (!boundedAxis(l.tx, MESH_TILT_LIMIT) || !boundedAxis(l.ty, MESH_TILT_LIMIT)) {
    return { x: l.x, y: l.y };
  }
  const mesh: GridMesh = { x: l.x, y: l.y, tx: l.tx, ty: l.ty };
  if (!boundedAxis(l.cx, MESH_CURV_LIMIT) || !boundedAxis(l.cy, MESH_CURV_LIMIT)) return mesh;
  return { ...mesh, cx: l.cx, cy: l.cy };
}

/** A curvature this far off the cross-line trend was measured on pieces, not optics — twin of
 *  `calibration.CURV_TREND_LIMIT`, where the number is explained. */
const CURV_TREND_LIMIT = 0.02;

const median = (values: number[]): number => {
  const s = [...values].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 === 1 ? s[h] : 0.5 * (s[h - 1] + s[h]);
};

function trendReplaced(values: number[]): number[] {
  const slopes: number[] = [];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) slopes.push((values[j] - values[i]) / (j - i));
  }
  const m = median(slopes);
  const b = median(values.map((v, k) => v - m * k));
  return values.map((v, k) => (Math.abs(v - (m * k + b)) > CURV_TREND_LIMIT ? m * k + b : v));
}

/**
 * Curvature is optics and optics are smooth across parallel lines — a line breaking out of the
 * others' Theil-Sen trend was measured on whatever stood ON it and takes the trend's value.
 * Twins: `calibration.smooth_mesh_curvature`, `smoothMeshCurvature` (CropBox.kt), all three pinned
 * by `curvature_trend_parity.json`.
 */
export function smoothMeshCurvature<T extends GridMesh>(mesh: T): T {
  if (!mesh.cx || !mesh.cy) return mesh;
  return { ...mesh, cx: trendReplaced(mesh.cx), cy: trendReplaced(mesh.cy) };
}

/** Simultaneous evaluations per point — the same argument as `CORNER_ITERATIONS` (CropBox.kt). */
const MESH_POINT_ITERATIONS = 3;

/** Where a line of `axis` sits at run `t` along it, in field fractions (`pos(t)` of the mesh). */
function lineAt(mesh: GridMesh, axis: "x" | "y", k: number, t: number): number {
  const o = axis === "x" ? mesh.x : mesh.y;
  const tilt = axis === "x" ? mesh.tx : mesh.ty;
  const curv = axis === "x" ? mesh.cx : mesh.cy;
  const d = t - 0.5;
  return o[k] + (tilt ? tilt[k] * d : 0) + (curv ? curv[k] * d * d : 0);
}

/**
 * The point of the MEASURED board that belongs to the ideal one at `(u, v)` — field fractions both
 * ways. A cell's two bounding lines blend linearly and the axes are coupled, so the pair is solved
 * by [MESH_POINT_ITERATIONS] simultaneous evaluations. A mesh without tilts is carried as tilt 0:
 * its offsets alone are still a correction. Twins: `calibration.mesh_point`, `meshPoint` (Kotlin).
 */
export function meshPoint(u: number, v: number, mesh: GridMesh): [number, number] {
  const cu = Math.max(0, Math.min(7, Math.floor(u * 8)));
  const cv = Math.max(0, Math.min(7, Math.floor(v * 8)));
  const fu = u * 8 - cu;
  const fv = v * 8 - cv;
  let x = u;
  let y = v;
  for (let i = 0; i < MESH_POINT_ITERATIONS; i++) {
    x = lineAt(mesh, "x", cu, y) * (1 - fu) + lineAt(mesh, "x", cu + 1, y) * fu;
    y = lineAt(mesh, "y", cv, x) * (1 - fv) + lineAt(mesh, "y", cv + 1, x) * fv;
  }
  return [x, y];
}

/** Fixed-point steps of `meshPointInverse`; the map is near-identity, so this converges fast. */
const MESH_INVERSE_ITERATIONS = 8;

/**
 * The inverse of [meshPoint]: a point of the MEASURED board back to the ideal one it belongs to.
 * What straightens a stroke painted on the straightened board back onto the raw raster it has to
 * be written into (`lib/matte-fix.ts`).
 */
export function meshPointInverse(x: number, y: number, mesh: GridMesh): [number, number] {
  let u = x;
  let v = y;
  for (let i = 0; i < MESH_INVERSE_ITERATIONS; i++) {
    const [px, py] = meshPoint(u, v, mesh);
    u += x - px;
    v += y - py;
  }
  return [u, v];
}

/**
 * `sampleBox` through the mesh: every destination pixel is the ideal board point, looked up where
 * the board's own lines say it actually is. One extra solve per pixel, no lookup table — a board
 * PNG is served once per frame, not per crop.
 */
export function sampleBoxMesh(
  src: Raster,
  h: Mat3,
  box: { x0: number; y0: number; x1: number; y1: number },
  mesh: GridMesh,
  boardSize: number,
  outW: number,
  outH: number,
): Buffer {
  const out = Buffer.alloc(outW * outH * 3);
  const { data, width, height, channels } = src;
  for (let j = 0; j < outH; j++) {
    const by = box.y0 + ((j + 0.5) / outH) * (box.y1 - box.y0);
    for (let i = 0; i < outW; i++) {
      const bx = box.x0 + ((i + 0.5) / outW) * (box.x1 - box.x0);
      const [mx, my] = meshPoint(bx / boardSize, by / boardSize, mesh);
      const [fx, fy] = applyMat(h, mx * boardSize, my * boardSize);
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

