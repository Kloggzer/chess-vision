/**
 * Android "Stored" recordings: `files/sessions/<id>/` inside a bundle — `log.jsonl` and a sparse
 * FEN-labelled JPEG per commit, no video and no candidate, so no chain step touches them.
 * `LabeledVideoPack.packLabeledSession` is their consumer and keys corrections on the id below.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { checkName, gameDir } from "@/lib/data";
import {
  boardToImage,
  type GridMesh,
  meshFromLines,
  type Raster,
  sampleBox,
  sampleBoxMesh,
  smoothMeshCurvature,
  squareCropBox,
  type TiltedMesh,
} from "@/lib/warp";

/** `phone-<id>`: every pack of these sessions ran with that id (see `packed_meta.json` under
 *  `data/datasets/phone-stored-…`), and `packLabeledSession` matches corrections against it. */
export const storedSessionId = (id: string) => `phone-${checkName(id, "stored session")}`;

/** The tracker logs the MARKER quad, which sits `DEFAULT_MARKER_MARGIN` outside the playing field. */
const MARKER_MARGIN = 0.045;
const BOARD_SIZE = 928;
const QUAD_FIT = "quad-fit.json";

export type StoredRow = {
  stem: string;
  /** Relative to the session directory, as written — `frames/0000.jpg`. */
  frame: string;
  ply: number;
  fen: string;
  corners: number[][];
};

export type StoredSession = {
  name: string;
  id: string;
  sessionId: string;
  dir: string;
  rows: StoredRow[];
};

/** `quad-fit.json` (`realgames.py` fit-stored): PLAYING-FIELD corners per frame, and their margin. */
type QuadFit = {
  margin: number;
  frames: Record<string, { corners: number[][]; align_worst_px: number; grid_lines?: GridMesh }>;
};

export type StoredQuad = {
  corners: number[][];
  margin: number;
  /** The grid fit had a word on this frame; `false` is the logged marker quad, unchanged. */
  fitted: boolean;
  worstPx?: number;
  /** The fit's 18 measured lines — present only when every line was located (mesh cut). */
  mesh?: GridMesh;
};

const cache = new Map<string, { key: number; value: StoredSession }>();
type FitCache = Map<string, { key: number; value: QuadFit }>;
const fits: FitCache = ((globalThis as { __chesslabQuadFits?: FitCache }).__chesslabQuadFits ??= new Map());

async function loadStored(name: string, dir: string, id: string): Promise<StoredSession | null> {
  const log = path.join(dir, "log.jsonl");
  const key = await stat(log).then((s) => s.mtimeMs, () => null);
  if (key === null) return null;
  const hit = cache.get(log);
  if (hit?.key === key) return hit.value;

  const rows: StoredRow[] = [];
  for (const line of (await readFile(log, "utf8")).split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as StoredRow & { dirty?: boolean };
    // `selectStoredRows` drops a dirty row before it is ever packed, so nobody may be asked about it.
    if (row.dirty === true) continue;
    const stem = path.basename(row.frame, path.extname(row.frame));
    rows.push({ stem, frame: row.frame, ply: row.ply, fen: row.fen, corners: row.corners });
  }
  rows.sort((a, b) => a.stem.localeCompare(b.stem));
  const value: StoredSession = { name, id, sessionId: storedSessionId(id), dir, rows };
  cache.set(log, { key, value });
  return value;
}

/** Every stored session of one bundle, newest id first. Empty when the bundle carries none. */
export async function storedSessions(name: string): Promise<StoredSession[]> {
  const root = path.join(gameDir(name), "files", "sessions");
  const ids = await readdir(root, { withFileTypes: true }).then(
    (entries) => entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse(),
    () => [] as string[],
  );
  const found = await Promise.all(ids.map((id) => loadStored(name, path.join(root, id), id)));
  return found.filter((s): s is StoredSession => s !== null && s.rows.length > 0);
}

/** The sidecar of one session, mtime-keyed — `null` while the fit has not run over it. */
export async function storedFit(dir: string): Promise<QuadFit | null> {
  const file = path.join(dir, QUAD_FIT);
  const key = await stat(file).then((s) => s.mtimeMs, () => null);
  if (key === null) return null;
  const hit = fits.get(file);
  if (hit?.key === key) return hit.value;
  const value = JSON.parse(await readFile(file, "utf8")) as QuadFit;
  fits.set(file, { key, value });
  return value;
}

/**
 * The quad a stored frame is cut with: the fitted PLAYING FIELD when the sidecar carries it,
 * else the logged marker quad and its outset. The margin comes from the FILE — the fitted corners
 * are the field itself, so warping them at `MARKER_MARGIN` would move every crop by 4.5 %.
 */
export function storedQuad(fit: QuadFit | null, row: StoredRow): StoredQuad {
  const frame = fit?.frames?.[row.stem];
  if (!fit || !frame) return { corners: row.corners, margin: MARKER_MARGIN, fitted: false };
  const raw = meshFromLines(frame.grid_lines);
  const mesh = raw && smoothMeshCurvature(raw);
  return { corners: frame.corners, margin: fit.margin, fitted: true,
           worstPx: frame.align_worst_px, ...(mesh ? { mesh } : {}) };
}

/** The crop composition every pack of these sessions cuts with (`manifestRow`, LabeledVideoPack.kt). */
const STORED_CROP = { pad_side: 0.05 };

async function storedRaster(dir: string, frame: string): Promise<Raster> {
  const { data, info } = await sharp(await readFile(path.join(dir, frame)))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function toPng(rgb: Buffer, size: number): Promise<Buffer> {
  return sharp(rgb, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 92 })
    .toBuffer();
}

async function storedCut(
  name: string,
  stem: string,
  size: number,
  rgbOf: (quad: StoredQuad, raster: Raster) => Buffer,
): Promise<Buffer> {
  checkName(stem, "frame");
  for (const session of await storedSessions(name)) {
    const row = session.rows.find((r) => r.stem === stem);
    if (!row) continue;
    const quad = storedQuad(await storedFit(session.dir), row);
    const raster = await storedRaster(session.dir, row.frame);
    return toPng(rgbOf(quad, raster), size);
  }
  throw new Error(`no stored frame ${stem} in ${name}`);
}

/**
 * The rectified playing field of one stored frame: the raw JPEG through the row's own quad, and
 * globally straightened by the mesh when the sidecar carries one — exactly as `lib/crops.ts`
 * does it for an exported session, only the margin differs.
 */
export function storedBoardPng(name: string, stem: string, size: number): Promise<Buffer> {
  return storedCut(name, stem, size, (quad, raster) => {
    const box = { x0: 0, y0: 0, x1: BOARD_SIZE, y1: BOARD_SIZE };
    const h = boardToImage(quad.corners, BOARD_SIZE, quad.margin);
    const mesh = quad.mesh;
    return mesh?.tx && mesh.ty
      ? sampleBoxMesh(raster, h, box, mesh as TiltedMesh, BOARD_SIZE, size, size)
      : sampleBox(raster, h, box, size, size);
  });
}

/**
 * One square of a stored frame — the nominal box, sampled through the sidecar's mesh when there
 * is one. Same global straightening as `storedBoardPng`, cut down to one cell, so this square is
 * the square inside that board rather than a second answer to the same question.
 */
export function storedCellPng(name: string, stem: string, square: string, size: number): Promise<Buffer> {
  return storedCut(name, stem, size, (quad, raster) => {
    const h = boardToImage(quad.corners, BOARD_SIZE, quad.margin);
    const box = squareCropBox(square, BOARD_SIZE, STORED_CROP);
    const mesh = quad.mesh;
    return mesh?.tx && mesh.ty
      ? sampleBoxMesh(raster, h, box, mesh as TiltedMesh, BOARD_SIZE, size, size)
      : sampleBox(raster, h, box, size, size);
  });
}
