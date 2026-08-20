/**
 * Cell crops and rectified boards, cut out of the session's stored board (`cutSource`).
 *
 * The review PNGs under `data/recordings/<name>/review/` are rectified but cover only the commit
 * bursts (60 of 1 729 stems on rec-20260808-003957), so they cannot serve the stream's frames.
 * `sharp` only decodes and encodes here; the sampling is `lib/warp.ts`, which has the projective
 * warp sharp lacks.
 */
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";
import { alphaPath } from "@/lib/matte";
import { boardPath, boardToStored, loadSession, type Session, sessionDir } from "@/lib/session";
import path from "node:path";
import {
  type Mat3,
  type Raster,
  sampleBox,
  sampleBoxMesh,
  sampleQuad,
  squareCropBox,
  type TiltedMesh,
} from "@/lib/warp";

/**
 * A decoded 1080p frame is 6 MB and its PNG costs ~0.25 s to inflate; a page of the bucket grid
 * asks for 60 crops out of ~22 frames AT ONCE. So: keep the last `CACHE_MAX` rasters, and share
 * the decode between the requests that are waiting for the same frame right now.
 */
const CACHE_MAX = 24;
const decoded = new Map<string, Raster>();
const inFlight = new Map<string, Promise<Raster>>();

/**
 * The raster a cut reads: the session's STORED board, and nothing else.
 *
 * The board is the rectified frame under the row's own quad (`realgames.write_board`) — the same
 * raster `crop_square` cuts the training crop from, at 115 KB against the frame's 3.3 MB. That is
 * what makes "the label view shows the crop the model will get" structural. A row without one is a
 * broken export, not a fallback: no recording has held `frames/` since the board store (2026-08-17).
 */
async function cutSource(session: Session, name: string, stem: string): Promise<{ raster: Raster; h: Mat3 }> {
  const board = session.byStem.get(stem)?.board;
  if (!board) throw new Error(`${name}/${stem}: row carries no board — re-export the recording`);
  const file = boardPath(name, board.rel);
  if (!(await stat(file).then(() => true, () => false))) {
    throw new Error(`${name}/${stem}: board ${board.rel} is missing — re-export the recording`);
  }
  // The store is where the bow comes out, once. Cutting a board that has not been through that
  // would put the barrel back into every crop, silently — so say so instead.
  if (!board.straightened) {
    throw new Error(`${name}/${stem}: board is not straightened — run \`chesslab session straighten\``);
  }
  return { raster: await rasterOf(file), h: boardToStored(session, board) };
}

/** The pen overwrites a file this cache keys by PATH alone — a stale raster would outlive it. */
export function forgetRaster(file: string): void {
  decoded.delete(file);
}

async function rasterOf(file: string): Promise<Raster> {
  const hit = decoded.get(file);
  if (hit) return hit;
  const pending = inFlight.get(file);
  if (pending) return pending;

  const job = sharp(await readFile(file))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      const raster = { data, width: info.width, height: info.height, channels: info.channels };
      decoded.set(file, raster);
      if (decoded.size > CACHE_MAX) decoded.delete(decoded.keys().next().value as string);
      return raster;
    })
    .finally(() => inFlight.delete(file));
  inFlight.set(file, job);
  return job;
}

/** What a cut is served as. WebP q92 is 5.4 KB against PNG's 37.3 for a 128 px cell — a lane page
 *  of 64 drops from 2.4 MB to 0.35 MB — and costs 0.8 ms more to encode. */
export const CUT_MIME = "image/webp";

function encode(rgb: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(rgb, { raw: { width, height, channels: 3 } }).webp({ quality: 92 }).toBuffer();
}

/**
 * One square out of one frame, at the board's OWN boundaries when the row carries them: the
 * cell's perspective quad with tilts (curved corners with the parabola term), its scalar
 * rectangle with offsets alone, the nominal box without a mesh. The same ladder `storedCellPng`
 * walks and `crop_square` (labeling.py) cuts the training crop with — the label view has to show
 * the crop the model will get, not a differently framed one.
 */
function cellRgb(session: Session, stem: string, square: string, raster: Raster, h: Mat3, size: number) {
  const box = squareCropBox(square, session.boardSize, session.crop, session.whitePov);
  return sampleBox(raster, h, box, size, size);
}

/**
 * Fertige Zell-PNGs, LRU über Sitzungsgrenzen: die Audit-Sortierung streut eine Seite über ~50
 * VERSCHIEDENE Frames, der 24er-Raster-Cache thrashte zu 100 % und jede Zelle zahlte den vollen
 * Frame-Decode („der cache aufm server ist zu klein", 2026-08-15). mtime im Schlüssel hält einen
 * Re-Export ehrlich; ~6000 × ~15 KB deckelt den Speicher.
 */
const CELL_PNGS_MAX = 6000;
type CellPngs = Map<string, Buffer>;
const cellPngs: CellPngs = ((globalThis as { __chesslabCellPngs?: CellPngs }).__chesslabCellPngs ??= new Map());

/** One square, cut with the profile's crop box (pad_side/pad_up), as the CNN would see it. */
export async function cellPng(name: string, stem: string, square: string, size: number) {
  const session = await loadSession(name);
  const rel = session.byStem.get(stem)?.board?.rel;
  // BEIDE mtimes: ein Re-Export ändert die CORNERS im Log, nie die Brett-Datei — ein Schlüssel nur
  // über das Brett servierte nach dem Neuschnitt die alten, krummen Crops weiter (2026-08-15), und
  // `session boards` schreibt das Brett neu, ohne das Log anzufassen.
  const [srcM, logM] = await Promise.all([
    rel ? stat(boardPath(name, rel)).then((s) => s.mtimeMs, () => 0) : Promise.resolve(0),
    stat(path.join(sessionDir(name), "log.jsonl")).then((s) => s.mtimeMs, () => 0),
  ]);
  // CUT_MIME too: this map holds ENCODED bytes and deliberately survives HMR on `globalThis`, so
  // changing the encoder without it served PNG under an `image/webp` header until a full restart.
  const key = `${name}|${stem}|${square}|${size}|${srcM}|${logM}|${CUT_MIME}`;
  const hit = cellPngs.get(key);
  if (hit) {
    cellPngs.delete(key);
    cellPngs.set(key, hit);
    return hit;
  }
  const { raster, h } = await cutSource(session, name, stem);
  const rgb = cellRgb(session, stem, square, raster, h, size);
  const out = await encode(rgb, size, size);
  cellPngs.set(key, out);
  if (cellPngs.size > CELL_PNGS_MAX) cellPngs.delete(cellPngs.keys().next().value!);
  return out;
}

/** The whole playing field — the drilldown's canvas. Straight already: see `cutSource`. */
export async function boardPng(name: string, stem: string, size: number) {
  const session = await loadSession(name);
  return encode(field(session, await cutSource(session, name, stem), size), size, size);
}

function field(session: Session, src: { raster: Raster; h: Mat3 }, size: number) {
  const box = { x0: 0, y0: 0, x1: session.boardSize, y1: session.boardSize };
  return sampleBox(src.raster, src.h, box, size, size);
}

/**
 * SAM 3's alpha — or the hand-corrected one beside it — cut with the SAME quad as the board under
 * it: the matte IS that raster (`matte.alpha_sam3`) and was pulled straight with it, so anything
 * else would overlay it a border off.
 */
export async function mattePng(name: string, stem: string, size: number) {
  const session = await loadSession(name);
  const board = session.byStem.get(stem)?.board;
  if (!board) throw new Error(`frame ${stem} carries no stored board`);
  const file = await alphaPath(name, stem);
  const src = { raster: await rasterOf(file), h: boardToStored(session, board) };
  return encode(field(session, src, size), size, size);
}

/**
 * The same cell's CLEAN median over its ply interval — the "before/after" the human compares
 * against. Per-pixel median over up to `SAMPLES` frames of the interval: a hand crossing a few
 * of them cannot outvote the resting board, which is the whole point of a median.
 */
const SAMPLES = 5;

export async function medianPng(name: string, stem: string, square: string, size: number) {
  const session = await loadSession(name);
  const ply = session.byStem.get(stem)?.ply;
  const stems = session.plies.get(ply ?? -1) ?? [stem];
  const step = Math.max(1, Math.floor(stems.length / SAMPLES));
  const picked = stems.filter((_, i) => i % step === 0).slice(0, SAMPLES);

  // Each sample through ITS OWN mesh: the frames of one interval are cut to the same cell, so the
  // median stacks the same square and not a slowly sliding one.
  const stack: Buffer[] = [];
  for (const s of picked) {
    const { raster, h } = await cutSource(session, name, s);
    stack.push(cellRgb(session, s, square, raster, h, size));
  }
  const out = Buffer.alloc(size * size * 3);
  const lane: number[] = [];
  for (let i = 0; i < out.length; i++) {
    lane.length = 0;
    for (const layer of stack) lane.push(layer[i]);
    lane.sort((a, b) => a - b);
    out[i] = lane[lane.length >> 1];
  }
  return encode(out, size, size);
}
