/** `data/reports/position-flags.jsonl` (READ ONLY), von `chesslab realgames position-flags`:
 *  Zellen, deren Bild von der Stellung abweicht, für die ihr Intervall bürgt. Eigene Lane, weil
 *  die Frage weder „liegt eine Hand drauf" (`hand-flags.ts`) noch „hat das Modell recht" ist. */
import path from "node:path";
import { dataDir } from "@/lib/data";
import { loadMeasurement, type Measurement } from "@/lib/measurement";

export type PositionFlag = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  /** Abstand zum gesetzten Brett des Intervalls (`labeling.SETTLE_LIMIT` ist die Schwelle). */
  dev: number;
  /** Was die Matte für dieses Feld gemessen hat — unter der Sichtbarkeitsgrenze, sonst kein Flag.
   *  `null` heisst UNGEMESSEN: `timing`- und `temporal`-Zeilen tragen keine Matte, und eine 0
   *  laese sich in der Lane als "die Matte sagt frei" (wie `lib/hand-flags.ts` es haelt). */
  matte_cov: number | null;
  /** `changed` = das Bild ist ein anderes; `unreadable` = zu wenig Feld war überhaupt zu sehen. */
  reason: string;
  /** SAM-free residual relative to reference contrast; not a coverage fraction. */
  temporal_score?: number;
};

export type PositionFlagsValue = {
  rows: PositionFlag[];
  /** Aufnahmen, auf denen `settle-scan` nie lief — null Zeilen heisst dort ungemessen, nicht
   *  unstrittig. Leer auch bei einer Kopfzeile aus der Zeit vor dem Feld. */
  unmeasured: string[];
};
/** `measured: false` = der Producer lief noch nicht; die Lane rendert `—`, nie eine leere Liste. */
export type PositionFlags = Measurement<PositionFlagsValue>;

export function positionFlagsPath(): string {
  return path.join(dataDir(), "reports", "position-flags.jsonl");
}

/** Die größte Abweichung zuerst: dort ist am ehesten wirklich etwas anderes im Bild. */
export function loadPositionFlags(): Promise<PositionFlags> {
  return loadMeasurement(positionFlagsPath(), parse);
}

function parse(lines: Record<string, unknown>[]): PositionFlagsValue {
  const rows: PositionFlag[] = [];
  let unmeasured: string[] = [];
  for (const o of lines) {
    // Die Kopfzeile trägt die Schwellen und kein `square` — sie ist kein Flag.
    if (Array.isArray(o._unmeasured)) unmeasured = o._unmeasured.map(String);
    if (typeof o.session_id !== "string" || typeof o.square !== "string") continue;
    if (typeof o.dev !== "number") continue;
    rows.push({
      session_id: o.session_id,
      frame: String(o.frame),
      square: o.square,
      fen_label: String(o.fen_label ?? ""),
      dev: o.dev,
      // `null` heisst UNGEMESSEN, wie `lib/hand-flags.ts` es daneben schon haelt: `timing_flags`
      // und `candidate_flags` schreiben es ausdruecklich so, und eine 0 laese sich in der Lane
      // als "die Matte sagt frei". `cov` ist die Schreibweise vor 2026-09-16.
      matte_cov: typeof o.matte_cov === "number" ? o.matte_cov
        : typeof o.cov === "number" ? o.cov : null,
      reason: String(o.reason ?? "changed"),
      ...(typeof o.temporal_score === "number" && Number.isFinite(o.temporal_score)
        ? { temporal_score: o.temporal_score } : {}),
    });
  }
  rows.sort((a, b) => b.dev - a.dev);
  return { rows, unmeasured };
}
