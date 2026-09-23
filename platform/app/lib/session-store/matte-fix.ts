/**
 * The pen's product: `mattes/<stem>.fixed.webp`, SAM's alpha with the human's strokes burnt in.
 * The board is shown STRAIGHTENED, the file has to be the raw raster SAM cut — so a stroke goes
 * back through the mesh and homography `mattePng` used. No coverage here: `occluders recut` cuts it.
 */
import { readFile, rm } from "node:fs/promises";
import sharp from "sharp";
import { writeFileAtomic } from "@/lib/atomic";
import { forgetRaster } from "@/lib/session-store/crops";
import { checkName } from "@/lib/session-store/recordings";
import { busy, runChesslabCapture } from "@/lib/chain/jobs";
import { alphaPath, fixedMattePath, mattePath, matteStamp } from "@/lib/session-store/matte";
import { lastLine } from "@/lib/chain/session-delete";
import { boardToStored, loadSession } from "@/lib/session-store/session";
import { applyMat, invertMat, type Mat3, meshPointInverse, type TiltedMesh } from "@/lib/warp";

/** Red raises the alpha, cyan lowers it — the two channels `components/alpha-pen.tsx` strokes. */
const UP = 0;
const DOWN = 1;
const HIT = 128;

type Grey = { data: Uint8Array; width: number; height: number };
type Rgba = Grey;

export type MaskInput = {
  alpha: Grey;
  /** The stroke layer, RGBA, in the coordinates of `/api/matte/<name>/<stem>?size=<width>`. */
  mask: Rgba;
  /** Board -> stored raster, the matte's own (`boardToStored`). */
  h: Mat3;
  boardSize: number;
  mesh?: TiltedMesh;
};

/**
 * SAM's alpha with the strokes applied, at the alpha's OWN size. Every destination pixel asks
 * where it sits on the straightened board and reads the mask there — the same direction a warp
 * runs in, so no stroke can leave a hole.
 */
export function applyAlphaMask({ alpha, mask, h, boardSize, mesh }: MaskInput): Buffer {
  const out = Buffer.from(alpha.data);
  const inv = invertMat(h);
  for (let y = 0; y < alpha.height; y++) {
    for (let x = 0; x < alpha.width; x++) {
      const [bx, by] = applyMat(inv, x + 0.5, y + 0.5);
      const [u, v] = mesh
        ? meshPointInverse(bx / boardSize, by / boardSize, mesh)
        : [bx / boardSize, by / boardSize];
      const i = Math.floor(u * mask.width);
      const j = Math.floor(v * mask.height);
      if (i < 0 || j < 0 || i >= mask.width || j >= mask.height) continue;
      const o = (j * mask.width + i) * 4;
      if (mask.data[o + 3] < HIT) continue;
      if (mask.data[o + UP] >= HIT) out[y * alpha.width + x] = 255;
      else if (mask.data[o + DOWN] >= HIT) out[y * alpha.width + x] = 0;
    }
  }
  return out;
}

async function grey(file: string): Promise<Grey> {
  // A buffer, not the path: sharp keeps a path mapped, and the alpha worker must be able to replace it.
  const { data, info } = await sharp(await readFile(file)).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function rgba(png: Buffer): Promise<Rgba> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Lossless: a lossy re-encode would smear the very edge the human just drew by hand. */
const encodeAlpha = (out: Buffer, width: number, height: number) =>
  sharp(out, { raw: { width, height, channels: 1 } }).webp({ lossless: true }).toBuffer();

export async function saveFixedAlpha(name: string, stem: string, maskPng: Buffer): Promise<string> {
  checkName(name, "game name");
  checkName(stem, "frame");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Dateien");

  const session = await loadSession(name);
  const board = session.byStem.get(stem)?.board;
  if (!board) throw new Error(`frame ${stem} carries no stored board`);
  // No mesh: the stroke is drawn on the straightened board, and the alpha is that same straight
  // raster (`realgames.straighten_boards` pulls both). Mapping back would undo the straightening.
  // Die HANDFASSUNG ist die Grundlage, wenn es sie gibt (`alphaPath`, was die Lane auch zeigt):
  // auf SAMs Rohalpha zu setzen warf jeden frueheren Strich weg — der Stift schickt nach
  // `pen.reset()` nur noch den neuen. Zurueck zu SAM kommt man ueber `restore`.
  const alpha = await grey(await alphaPath(name, stem));
  const fixed = applyAlphaMask({
    alpha,
    mask: await rgba(maskPng),
    h: boardToStored(session, board),
    boardSize: session.boardSize,
  });

  const file = fixedMattePath(name, stem);
  await writeFileAtomic(file, await encodeAlpha(fixed, alpha.width, alpha.height));
  forgetRaster(file);
  return file;
}

/**
 * "Da ist gar nichts": ein leeres Alpha an der Stelle von SAMs Fund. Derselbe Weg wie ein Strich —
 * Pixel jetzt, Coverage erst mit `occluders recut`, das daraus ueberall 0 schneidet.
 */
export async function clearAlpha(name: string, stem: string): Promise<string> {
  checkName(name, "game name");
  checkName(stem, "frame");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Dateien");

  const { width, height } = await sharp(await readFile(mattePath(name, stem))).metadata();
  if (!width || !height) throw new Error(`frame ${stem} carries no alpha`);

  const file = fixedMattePath(name, stem);
  await writeFileAtomic(file, await encodeAlpha(Buffer.alloc(width * height), width, height));
  forgetRaster(file);
  return file;
}

/** Den Rueckweg zu `clearAlpha`: die Handfassung faellt weg, SAMs Schnitt liegt daneben und
 *  ist damit wieder der gueltige (`matte.alphaPath`). Fehlt sie schon, ist nichts zu tun. */
export async function restoreAlpha(name: string, stem: string): Promise<string> {
  checkName(name, "game name");
  checkName(stem, "frame");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Dateien");

  const file = fixedMattePath(name, stem);
  await rm(file, { force: true });
  forgetRaster(file);
  return file;
}

/**
 * `alpha-worker` APPENDS to the file `recut` rewrites whole. A fresh mtime means one is mid-run,
 * and rewriting under it would drop the rows it wrote since — so this refuses instead.
 */
const WORKER_QUIET_MS = 60_000;

export async function recutMatte(name: string): Promise<{ done: string }> {
  checkName(name, "game name");
  if (busy()) throw new Error("ein Job läuft gerade — der schreibt womöglich dieselben Manifeste");
  const age = Date.now() - (await matteStamp(name));
  if (age < WORKER_QUIET_MS) {
    throw new Error("matte.jsonl wurde gerade geschrieben — der alpha-worker läuft, recut würde seine Zeilen verlieren");
  }
  const run = await runChesslabCapture(["occluders", "recut", name]);
  if (run.code !== 0) throw new Error((run.stderr || run.stdout).trim() || `${run.command} exited ${run.code}`);
  return { done: lastLine(run.stdout) };
}
