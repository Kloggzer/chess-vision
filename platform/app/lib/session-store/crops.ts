/** Cell crops and rectified boards, cut out of the session's stored board (`cutSource`). `sharp`
 *  only decodes and encodes; the projective warp it lacks is `lib/warp.ts`. */
import { readFile, stat } from "node:fs/promises";
import { LRUCache } from "lru-cache";
import sharp from "sharp";
import { alphaPath } from "@/lib/session-store/matte";
import { stampOrMissing } from "@/lib/measurement";
import { recordingFile } from "@/lib/session-store/recordings";
import { boardPath, boardToStored, loadSession, type Session } from "@/lib/session-store/session";
import { type Mat3, type Raster, sampleBox, squareCropBox } from "@/lib/warp";

/** Capped by BYTES, not count: a fixed 24 rasters held 50 to 600 MB depending on resolution, and
 *  the machine trains next to it — the crashes here were memory, not GPU. */
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

/** The session's STORED board and nothing else — the raster `crop_square` cuts the training crop
 *  from, so the label view shows the crop the model gets. A row without one is a broken export. */
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

/** Der Sofort-Wurf neben dem mtime-Schluessel. Ueber das PRAEFIX: der Schluessel ist
 *  `<pfad>|<mtime>`, nach dem Pfad allein trifft `delete` nie einen Eintrag. */
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

/** One square at the board's OWN boundaries — same cut as `crop_square` (labeling.py), so the label
 *  view shows the crop the model will get. */
function cellRgb(session: Session, square: string, raster: Raster, h: Mat3, size: number) {
  const box = squareCropBox(square, session.boardSize, session.crop, session.whitePov);
  return sampleBox(raster, h, box, size, size);
}

/** Fertige Zell-Crops, LRU ueber Sitzungsgrenzen: eine Audit-Seite streut ueber ~50 Frames und der
 *  Raster-Cache allein thrashte. Nach BYTES gedeckelt, mtime im Schluessel. */
const CELL_PNGS_BYTES_MAX = 96 * 1024 * 1024;
type CellPngs = LRUCache<string, Buffer>;
const cellPngs: CellPngs = ((globalThis as { __chesslabCellPngsLru?: CellPngs }).__chesslabCellPngsLru ??=
  new LRUCache<string, Buffer>({ maxSize: CELL_PNGS_BYTES_MAX, sizeCalculation: (b) => b.byteLength }));

/** One square, cut with the profile's crop box (pad_side), as the CNN would see it. */
export async function cellPng(name: string, stem: string, square: string, size: number) {
  const session = await loadSession(name);
  const rel = session.byStem.get(stem)?.board?.rel;
  // BEIDE mtimes und `candidate.json`: ein Re-Export aendert die CORNERS im Log, `session boards`
  // das Brett ohne das Log, und `pad_side`/`board_size` stehen nur im Kandidaten — jede der drei
  // Dateien allein liess den Cache den alten Schnitt servieren.
  const [srcM, logM, candM] = await Promise.all([
    rel ? stampOrMissing(boardPath(name, rel)) : null,
    stampOrMissing(recordingFile(name, "log")),
    stampOrMissing(recordingFile(name, "candidate")),
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

/** Cut with the SAME quad as the board under it: the matte IS that raster and was pulled straight
 *  with it, anything else would overlay it a border off. */
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

/** Per-pixel median over up to `SAMPLES` frames of the ply interval: a hand crossing a few of them
 *  cannot outvote the resting board. */
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
