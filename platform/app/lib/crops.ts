/**
 * Cell crops and rectified boards, cut server-side out of the RAW session frames.
 *
 * The review PNGs under `data/realgames/<name>/frames/` are already rectified but cover only the
 * commit bursts — measured on rec-20260808-003957: 60 of 1 729 session stems (3.5 %), so they
 * cannot serve the proposal frames. Everything here therefore goes through the per-frame quad.
 *
 * `sharp` is used for exactly two things — PNG in, PNG out. The sampling is `lib/warp.ts`;
 * sharp has no projective warp (only `.affine()`), and Node has no PNG codec.
 */
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";
import { sessionDir } from "@/lib/chain";
import { framePath, loadSession, type Session } from "@/lib/session";
import path from "node:path";
import { boardToImage, sampleBox, squareCropBox, type Raster } from "@/lib/warp";

/**
 * A decoded 1080p frame is 6 MB and its PNG costs ~0.25 s to inflate; a page of the bucket grid
 * asks for 60 crops out of ~22 frames AT ONCE. So: keep the last `CACHE_MAX` rasters, and share
 * the decode between the requests that are waiting for the same frame right now.
 */
const CACHE_MAX = 24;
const decoded = new Map<string, Raster>();
const inFlight = new Map<string, Promise<Raster>>();

async function frameRaster(name: string, stem: string): Promise<Raster> {
  const file = framePath(name, stem);
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

function png(rgb: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(rgb, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 3 }).toBuffer();
}

function homographyFor(session: Session, stem: string) {
  const corners = session.byStem.get(stem)?.corners;
  if (!corners) throw new Error(`frame ${stem} is not in the session log`);
  return boardToImage(corners, session.boardSize, session.margin);
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
  // BEIDE mtimes: ein Re-Export ändert die CORNERS im Log, nie die Frame-Datei — ein Schlüssel nur
  // über das Frame servierte nach dem Neuschnitt die alten, krummen Crops weiter (2026-08-15).
  const [frameM, logM] = await Promise.all([
    stat(framePath(name, stem)).then((s) => s.mtimeMs, () => 0),
    stat(path.join(sessionDir(name), "log.jsonl")).then((s) => s.mtimeMs, () => 0),
  ]);
  const key = `${name}|${stem}|${square}|${size}|${frameM}|${logM}`;
  const hit = cellPngs.get(key);
  if (hit) {
    cellPngs.delete(key);
    cellPngs.set(key, hit);
    return hit;
  }
  const session = await loadSession(name);
  const box = squareCropBox(square, session.boardSize, session.crop, session.whitePov);
  const rgb = sampleBox(await frameRaster(name, stem), homographyFor(session, stem), box, size, size);
  const out = await png(rgb, size, size);
  cellPngs.set(key, out);
  if (cellPngs.size > CELL_PNGS_MAX) cellPngs.delete(cellPngs.keys().next().value!);
  return out;
}

/** The whole playing field, rectified — the drilldown's canvas and the tinder thumbnail. */
export async function boardPng(name: string, stem: string, size: number) {
  const session = await loadSession(name);
  const box = { x0: 0, y0: 0, x1: session.boardSize, y1: session.boardSize };
  const rgb = sampleBox(await frameRaster(name, stem), homographyFor(session, stem), box, size, size);
  return png(rgb, size, size);
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

  const box = squareCropBox(square, session.boardSize, session.crop, session.whitePov);
  const stack: Buffer[] = [];
  for (const s of picked) {
    stack.push(sampleBox(await frameRaster(name, s), homographyFor(session, s), box, size, size));
  }
  const out = Buffer.alloc(size * size * 3);
  const lane: number[] = [];
  for (let i = 0; i < out.length; i++) {
    lane.length = 0;
    for (const layer of stack) lane.push(layer[i]);
    lane.sort((a, b) => a - b);
    out[i] = lane[lane.length >> 1];
  }
  return png(out, size, size);
}
