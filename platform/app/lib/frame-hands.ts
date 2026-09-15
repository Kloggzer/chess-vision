/** `data/reports/frame-hands.jsonl` (READ ONLY), von `chesslab realgames frame-hands`: welche
 *  exportierten Frames eine Hand am BRETT tragen. Eigene Datei statt `dirty_reason`, weil
 *  `framescan.classify` die Hand-Aussage verliert, sobald `stale` oder `changed` gewinnt. */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";

export type FrameHand = {
  /** Der Gate-Wert 0..1, oder `null` auf einem Scan von vor dem destillierten Kopf. */
  gate: number | null;
  /** Die Felder, die der Rillen-Sensor als verdeckt benennt — Recall 71 %, Precision 99,6 %. */
  grid: string[];
};

export type FrameHands = {
  /** `session_id|stem -> Hand`. Ein fehlender Schluessel heisst nur fuer eine GESCANNTE Session
   *  "keine Hand" — `scannedSessions` sagt, welche das sind. */
  rows: Map<string, FrameHand>;
  /** Die gescannten Sessions. Ausserhalb davon ist eine Aufnahme UNGEMESSEN, nicht handfrei. */
  scannedSessions: Set<string>;
  present: boolean;
};

export function frameHandsPath(): string {
  return path.join(dataDir(), "reports", "frame-hands.jsonl");
}

export const handKey = (sessionId: string, stem: string): string => `${sessionId}|${stem}`;

type Cache = Map<string, { key: string; value: FrameHands }>;
const cache: Cache = ((globalThis as { __chesslabFrameHands?: Cache }).__chesslabFrameHands ??= new Map());

const EMPTY: FrameHands = { rows: new Map(), scannedSessions: new Set(), present: false };

export async function loadFrameHands(): Promise<FrameHands> {
  const file = frameHandsPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    cache.set(file, { key, value: EMPTY });
    return EMPTY;
  }

  const rows = new Map<string, FrameHand>();
  const scanned = new Set<string>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      // Die Kopfzeile traegt `_sessions` und kein `square`-loses `frame` — sie ist kein Flag.
      if (Array.isArray(o._sessions)) {
        for (const id of o._sessions) scanned.add(String(id));
        continue;
      }
      if (typeof o.session_id !== "string" || o.frame === undefined) continue;
      rows.set(handKey(o.session_id, String(o.frame)), {
        gate: typeof o.gate === "number" ? o.gate : null,
        grid: Array.isArray(o.grid) ? o.grid.map(String) : [],
      });
    } catch {
      /* eine halb geschriebene Zeile ist kein Flag */
    }
  }
  const value: FrameHands = { rows, scannedSessions: scanned, present: true };
  cache.set(file, { key, value });
  return value;
}
