/** `data/reports/frame-hands.jsonl` (READ ONLY), von `chesslab realgames frame-hands`: welche
 *  exportierten Frames eine Hand am BRETT tragen. Eigene Datei statt `dirty_reason`, weil
 *  `framescan.classify` die Hand-Aussage verliert, sobald `stale` oder `changed` gewinnt. */
import path from "node:path";
import { dataDir } from "@/lib/session-store/recordings";
import { loadMeasurement, type Measurement } from "@/lib/measurement";

export type FrameHand = {
  /** Der Gate-Wert 0..1, oder `null` auf einem Scan von vor dem destillierten Kopf. */
  gate: number | null;
  /** Die Felder, die der Rillen-Sensor als verdeckt benennt — Recall 71 %, Precision 99,6 %. */
  grid: string[];
};

type FrameHandsValue = {
  /** `session_id|stem -> Hand`. Ein fehlender Schluessel heisst nur fuer eine GESCANNTE Session
   *  "keine Hand" — `scannedSessions` sagt, welche das sind. */
  rows: Map<string, FrameHand>;
  /** Die gescannten Sessions. Ausserhalb davon ist eine Aufnahme UNGEMESSEN, nicht handfrei. */
  scannedSessions: Set<string>;
};
export type FrameHands = Measurement<FrameHandsValue>;

function frameHandsPath(): string {
  return path.join(dataDir(), "reports", "frame-hands.jsonl");
}

export const handKey = (sessionId: string, stem: string): string => `${sessionId}|${stem}`;

export function loadFrameHands(): Promise<FrameHands> {
  return loadMeasurement(frameHandsPath(), parse);
}

function parse(lines: Record<string, unknown>[]): FrameHandsValue {
  const rows = new Map<string, FrameHand>();
  const scanned = new Set<string>();
  for (const o of lines) {
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
  }
  return { rows, scannedSessions: scanned };
}
