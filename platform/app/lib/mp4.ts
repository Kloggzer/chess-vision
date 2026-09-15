/**
 * Is this MP4 finalized?
 *
 * `moov` is the index, and a recorder writes it LAST. A file with `ftyp` and `mdat` but no `moov`
 * is a recording that was interrupted — the phone was killed mid-capture — and FFmpeg answers it
 * with `avformat_open_input() error -1094995529` after opening and scanning the file.
 *
 * Four of the eleven recordings transferred on 2026-08-13 are in that state (1.99 GB), and each of
 * them cost a ten-minute replay to find out. Reading the atom chain costs three seeks: an MP4 is a
 * list of length-prefixed boxes, so the header of each says where the next one starts.
 */
import { open, stat } from "node:fs/promises";
import path from "node:path";

const HEADER = 8;
const LARGE_SIZE = 1;
/** A file with more boxes than this before `moov` is not a phone recording; stop looking. */
const MAX_BOXES = 16;

export type Mp4Check = { finalized: boolean; boxes: string[] };

export async function checkMp4(file: string): Promise<Mp4Check> {
  const handle = await open(file, "r");
  try {
    const { size } = await handle.stat();
    const boxes: string[] = [];
    let at = 0;
    while (at + HEADER <= size && boxes.length < MAX_BOXES) {
      const header = Buffer.alloc(HEADER + HEADER);
      const { bytesRead } = await handle.read(header, 0, header.length, at);
      if (bytesRead < HEADER) break;
      const type = header.toString("latin1", 4, HEADER);
      boxes.push(type);
      if (type === "moov") return { finalized: true, boxes };
      const short = header.readUInt32BE(0);
      // A box of size 1 declares a 64-bit length in the eight bytes that follow — that is how a
      // gigabyte of `mdat` is expressed, so it is the normal case here, not an exotic one.
      const length = short === LARGE_SIZE ? Number(header.readBigUInt64BE(HEADER)) : short;
      if (length <= 0) break;
      at += length;
    }
    return { finalized: false, boxes };
  } finally {
    await handle.close();
  }
}

/**
 * Jedes Segment der Aufnahme, in der Reihenfolge, in der `Recording` sie liest — der Kopf und
 * jedes `video-NNN.mp4` daneben (`src/chesslab/recording.py:22`). Die Suche endet an der ersten
 * Luecke, genau wie dort: `video-004` ohne `video-003` gehoert nicht mehr zu diesem Strom.
 */
export async function recordingSegments(head: string): Promise<string[]> {
  const dir = path.dirname(head);
  const stem = path.basename(head, path.extname(head));
  const out = [head];
  for (let i = 1; ; i++) {
    const part = path.join(dir, `${stem}-${String(i).padStart(3, "0")}${path.extname(head)}`);
    if (!(await stat(part).then((s) => s.isFile(), () => false))) return out;
    out.push(part);
  }
}

/**
 * Der erste Teil ohne Index, oder `null`. Nur den Kopf zu pruefen deckte bei einer 11-teiligen
 * Aufnahme 9 % ab, und der Export endet an einem fehlenden `moov` still.
 */
export async function firstUnfinalized(head: string): Promise<string | null> {
  for (const part of await recordingSegments(head)) {
    if (!(await checkMp4(part)).finalized) return part;
  }
  return null;
}
