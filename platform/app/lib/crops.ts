/**
 * Cell crops and rectified boards, cut out of the session's stored board (`cutSource`).
 *
 * The review PNGs under `data/recordings/<name>/review/` are rectified but cover only the commit
 * bursts (60 of 1 729 stems on rec-20260808-003957), so they cannot serve the stream's frames.
 * `sharp` only decodes and encodes here; the sampling is `lib/warp.ts`, which has the projective
 * warp sharp lacks.
 */
import { readFile, stat } from "node:fs/promises";
import { LRUCache } from "lru-cache";
import sharp from "sharp";
import { alphaPath } from "@/lib/matte";
import { stampOrMissing } from "@/lib/measurement";
import { boardPath, boardToStored, loadSession, type Session, sessionDir } from "@/lib/session";
import path from "node:path";
import { type Mat3, type Raster, sampleBox, squareCropBox } from "@/lib/warp";

/**
 * A decoded 1080p frame is 6 MB and its PNG costs ~0.25 s to inflate; a page of the bucket grid
 * asks for 60 crops out of ~22 frames AT ONCE. Gedeckelt wird nach BYTES, nicht nach Stueckzahl:
 * eine feste Zahl von 24 hielt je nach Aufloesung 50 bis 600 MB fest, und der Rechner trainiert
 * daneben — die Abstuerze hier waren Speicher, nicht GPU.
 */
const RASTER_BYTES_MAX = 256 * 1024 * 1024;
const decoded = new LRUCache<string, Raster>({
  maxSize: RASTER_BYTES_MAX,
  sizeCalculation: (r) => r.data.byteLength,
  // Buendelt gleichzeitige Anfragen auf denselben Frame zu EINEM Dekodiervorgang.
  fetchMethod: (file) => decode(file.slice(0, file.lastIndexOf("|"))),
  // Verdraengt der Deckel einen Eintrag, dessen Dekodierung noch laeuft, bekommt die wartende
  // Anfrage sonst `Error('evicted')` — aus einem Cache-Fehlschuss wuerde ein 500. So bekommt sie
  // ihre Pixel und nur der Cache geht leer aus.
  ignoreFetchAbort: true,
});

async function decode(path_: string): Promise<Raster> {
  const { data, info } = await sharp(await readFile(path_)).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

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
  // Nur ENOENT ist "fehlt, neu exportieren"; ein EACCES schickte den Menschen in einen Re-Export.
  await stat(file).catch((e: NodeJS.ErrnoException) => {
    if (e?.code !== "ENOENT") throw e;
    throw new Error(`${name}/${stem}: board ${board.rel} is missing — re-export the recording`);
  });
  // The store is where the bow comes out, once. Cutting a board that has not been through that
  // would put the barrel back into every crop, silently — so say so instead.
  if (!board.straightened) {
    throw new Error(`${name}/${stem}: board is not straightened — run \`chesslab session straighten\``);
  }
  return { raster: await rasterOf(file), h: boardToStored(session, board) };
}

/** Der Stift ueberschreibt eine Datei; der Cache traegt die mtime, das hier ist der Sofort-Wurf.
 *  Ueber das PRAEFIX, weil der Schluessel `<pfad>|<mtime>` ist — nach dem Pfad allein traf das
 *  `delete` nie einen Eintrag und der Wurf war seit je ein Nulloperator. */
export function forgetRaster(file: string): void {
  for (const key of [...decoded.keys()]) if (key.startsWith(`${file}|`)) decoded.delete(key);
}

async function rasterOf(path_: string): Promise<Raster> {
  // Der Schluessel traegt die mtime: ein Re-Export schreibt das Brett unter demselben Namen neu,
  // und nach dem Pfad allein servierte der Cache die Pixel von vorher.
  const stamp = (await stampOrMissing(path_)) ?? "none";
  return (await decoded.fetch(`${path_}|${stamp}`))!;
}

/** What a cut is served as. WebP q92 is 5.4 KB against PNG's 37.3 for a 128 px cell — a lane page
 *  of 64 drops from 2.4 MB to 0.35 MB — and costs 0.8 ms more to encode. */
export const CUT_MIME = "image/webp";

function encode(rgb: Buffer, width: number, height: number): Promise<Buffer> {
  return sharp(rgb, { raw: { width, height, channels: 3 } }).webp({ quality: 92 }).toBuffer();
}

/**
 * One square out of one frame, at the board's OWN boundaries when the row carries them: the
 * the nominal box, out of a board that is already straight. Same cut as `crop_square`
 * (labeling.py) — the label view has to show the crop the model will get.
 */
function cellRgb(session: Session, square: string, raster: Raster, h: Mat3, size: number) {
  const box = squareCropBox(square, session.boardSize, session.crop, session.whitePov);
  return sampleBox(raster, h, box, size, size);
}

/**
 * Fertige Zell-PNGs, LRU über Sitzungsgrenzen: die Audit-Sortierung streut eine Seite über ~50
 * VERSCHIEDENE Frames, der 24er-Raster-Cache thrashte zu 100 % und jede Zelle zahlte den vollen
 * Frame-Decode („der cache aufm server ist zu klein", 2026-08-15). mtime im Schlüssel hält einen
 * Re-Export ehrlich; gedeckelt wird nach BYTES, damit eine Seite grosser Crops nicht so viel
 * Speicher haelt wie tausend kleine.
 */
const CELL_PNGS_BYTES_MAX = 96 * 1024 * 1024;
type CellPngs = LRUCache<string, Buffer>;
const cellPngs: CellPngs = ((globalThis as { __chesslabCellPngsLru?: CellPngs }).__chesslabCellPngsLru ??=
  new LRUCache<string, Buffer>({ maxSize: CELL_PNGS_BYTES_MAX, sizeCalculation: (b) => b.byteLength }));

/** One square, cut with the profile's crop box (pad_side), as the CNN would see it. */
export async function cellPng(name: string, stem: string, square: string, size: number) {
  const session = await loadSession(name);
  const rel = session.byStem.get(stem)?.board?.rel;
  // BEIDE mtimes: ein Re-Export ändert die CORNERS im Log, nie die Brett-Datei — ein Schlüssel nur
  // über das Brett servierte nach dem Neuschnitt die alten, krummen Crops weiter (2026-08-15), und
  // `session boards` schreibt das Brett neu, ohne das Log anzufassen.
  // Und `candidate.json`: `pad_side` und `board_size` schneiden die Box, stehen aber in KEINER der
  // beiden anderen Dateien — ein neues Profil liess sie beide unberuehrt und der Cache servierte
  // den Schnitt von vorher weiter.
  const [srcM, logM, candM] = await Promise.all([
    rel ? stampOrMissing(boardPath(name, rel)) : null,
    stampOrMissing(path.join(sessionDir(name), "log.jsonl")),
    stampOrMissing(path.join(sessionDir(name), "candidate.json")),
  ]);
  // CUT_MIME too: this map holds ENCODED bytes and deliberately survives HMR on `globalThis`, so
  // changing the encoder without it served PNG under an `image/webp` header until a full restart.
  const key = `${name}|${stem}|${square}|${size}|${srcM}|${logM}|${candM}|${CUT_MIME}`;
  const hit = cellPngs.get(key);
  if (hit) return hit;
  const { raster, h } = await cutSource(session, name, stem);
  const rgb = cellRgb(session, square, raster, h, size);
  const out = await encode(rgb, size, size);
  cellPngs.set(key, out);
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
  // Dieselbe Wache wie `cutSource`: die Matte IST das Brett-Raster, ein ungerades Brett legte
  // die Woelbung sonst still in jede Alpha-Ansicht.
  if (!board.straightened) {
    throw new Error(`${name}/${stem}: board is not straightened — run \`chesslab session straighten\``);
  }
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
  // Gleichmaessig ueber das GANZE Intervall: `floor(n/SAMPLES)` plus `slice` traf nur den Anfang
  // (bei 12 Frames die Indizes 0-8), und dort zieht die Hand sich gerade erst zurueck.
  const n = stems.length;
  const take = Math.min(SAMPLES, n);
  const picked = take <= 1
    ? stems.slice(0, 1)
    : [...new Set(Array.from({ length: take }, (_, i) => Math.round((i * (n - 1)) / (take - 1))))]
        .map((i) => stems[i]);

  // Each sample through its own board: the frames of one interval were straightened with their
  // own mesh, so the median stacks the same square and not a slowly sliding one.
  const stack: Buffer[] = [];
  for (const s of picked) {
    const { raster, h } = await cutSource(session, name, s);
    stack.push(cellRgb(session, square, raster, h, size));
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
