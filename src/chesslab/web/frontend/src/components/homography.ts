/** The 4-point homography, so the corner editor can think in RECTIFIED pixels.
 *
 *  The corner quad is stored in ORIGINAL frame pixels, but the preview a user judges by is the
 *  rectified board (`warp_from_corners`: the playing field fills `board_size × board_size`).
 *  Editing the stored numbers therefore means nudging a crop around on a picture you are not
 *  looking at, with the effect appearing transformed and mirrored in the one you are. These two
 *  functions let the UI take an edit expressed where the user's eyes are — "show 8 px more at
 *  a8" — and convert it into the frame coordinates the backend stores.
 */

export type Pt = [number, number];

/** Move the row with the largest magnitude in `col` to the diagonal. -1 when the column is
 *  numerically empty, which is what "the four points are degenerate" looks like from in here. */
function pivot(a: number[][], col: number): number {
  let best = col;
  for (let r = col + 1; r < 8; r++) if (Math.abs(a[r][col]) > Math.abs(a[best][col])) best = r;
  if (Math.abs(a[best][col]) < 1e-9) return -1;
  [a[col], a[best]] = [a[best], a[col]];
  return best;
}

/** Clear `col` in every row but the pivot's. */
function reduceColumn(a: number[][], col: number): void {
  for (let r = 0; r < 8; r++) {
    if (r === col) continue;
    const f = a[r][col] / a[col][col];
    for (let c = col; c <= 8; c++) a[r][c] -= f * a[col][c];
  }
}

/** Gauss-Jordan with partial pivoting, in place. False when the system is singular. */
function eliminate(a: number[][]): boolean {
  for (let col = 0; col < 8; col++) {
    if (pivot(a, col) < 0) return false;
    reduceColumn(a, col);
  }
  return true;
}

/** Solve for H with `dst ≈ H · src`, from exactly four correspondences.
 *
 *  Straight 8×8 Gaussian elimination with partial pivoting on the standard DLT layout. Four
 *  points is the minimum and there is nothing to over-determine, so no least squares: either the
 *  quad is degenerate (three points collinear) and the system is singular, or the answer is exact.
 *  Returns null on singularity rather than NaNs — a caller that silently propagated those would
 *  write garbage corners into the session log.
 */
function solveHomography(src: Pt[], dst: Pt[]): number[] | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  const a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  if (!eliminate(a)) return null;
  const h = a.map((row, i) => row[8] / row[i]);
  return [...h, 1];
}

/** Apply a homography to one point. */
function applyH(h: number[], p: Pt): Pt {
  const w = h[6] * p[0] + h[7] * p[1] + h[8];
  return [(h[0] * p[0] + h[1] * p[1] + h[2]) / w, (h[3] * p[0] + h[4] * p[1] + h[5]) / w];
}

/** The rectified canvas corners in stored order `[a8, h8, h1, a1]`, for a `board_size` warp. */
function canvasCorners(boardSize: number): Pt[] {
  return [[0, 0], [boardSize, 0], [boardSize, boardSize], [0, boardSize]];
}

/** Move corner `slot` by `(dx, dy)` RECTIFIED pixels, and return the new frame-pixel quad.
 *
 *  Sign convention is the one a person uses when looking at the preview: **positive means show
 *  more** on that side. So the target canvas point is the corner moved OUTWARD by the offset,
 *  which pulls in board that currently sits outside the crop.
 *
 *  Returns the quad unchanged when the current one is degenerate — the caller keeps a usable
 *  state rather than a NaN one.
 */
export function nudgeInRectified(quad: Pt[], boardSize: number, slot: number,
                                 dx: number, dy: number): Pt[] {
  const cc = canvasCorners(boardSize);
  const inv = solveHomography(cc, quad);          // rectified -> frame, straight from the 4 pairs
  if (!inv) return quad;
  // Outward is away from the board centre, i.e. negative at the top-left corner and positive at
  // the bottom-right one — hence the sign of each corner's own position relative to the centre.
  const sx = cc[slot][0] === 0 ? -1 : 1;
  const sy = cc[slot][1] === 0 ? -1 : 1;
  const target: Pt = [cc[slot][0] + sx * dx, cc[slot][1] + sy * dy];
  const out = quad.slice() as Pt[];
  out[slot] = applyH(inv, target);
  return out;
}

/** Where a corner currently sits in RECTIFIED pixels, relative to its nominal canvas corner.
 *
 *  The inverse of `nudgeInRectified`, so the numeric fields can show what the user has actually
 *  asked for rather than an opaque frame coordinate. Same "positive = more visible" convention.
 */
export function rectifiedOffset(quad: Pt[], base: Pt[], boardSize: number, slot: number): Pt {
  const cc = canvasCorners(boardSize);
  const fwd = solveHomography(base, cc);          // frame -> rectified, from the UNTUNED quad
  if (!fwd) return [0, 0];
  const p = applyH(fwd, quad[slot]);
  const sx = cc[slot][0] === 0 ? -1 : 1;
  const sy = cc[slot][1] === 0 ? -1 : 1;
  return [sx * (p[0] - cc[slot][0]), sy * (p[1] - cc[slot][1])];
}
