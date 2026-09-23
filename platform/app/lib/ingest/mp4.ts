/** Is this MP4 finalized? `moov` is written LAST, so an interrupted recording has `ftyp` and `mdat`
 *  but no `moov`, and FFmpeg fails it only after scanning the file. The atom chain says so in a few
 *  seeks: each box header says where the next one starts. */
import { open, stat } from "node:fs/promises";
import { absentOnly } from "@/lib/measurement";
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
async function recordingSegments(head: string): Promise<string[]> {
  const dir = path.dirname(head);
  const stem = path.basename(head, path.extname(head));
  const out = [head];
  for (let i = 1; ; i++) {
    const part = path.join(dir, `${stem}-${String(i).padStart(3, "0")}${path.extname(head)}`);
    if (!(await stat(part).catch(absentOnly))?.isFile()) return out;
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
