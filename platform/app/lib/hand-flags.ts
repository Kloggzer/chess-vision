/** `data/reports/hand-flags.jsonl` (READ ONLY), von `chesslab realgames hand-flags`: Zellen, die
 *  der Occlusion-Kopf für verdeckt hält und die Matte für frei. Eigene Lane statt Audit, weil dort
 *  Klassen entschieden werden und `occluded` gemessen statt gelabelt ist (`audit-flags.ts`). */
import path from "node:path";
import { dataDir } from "@/lib/data";
import { loadMeasurement, type Measurement } from "@/lib/measurement";

export type HandFlag = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  /** Was der Occlusion-Kopf behauptet (0..1). */
  model_cov: number;
  /** Was die Matte gemessen hat, oder `null` — dann hat sie dieses Frame nie gesehen. */
  matte_cov: number | null;
};

/** `measured: false` = der Producer lief noch nicht; die Lane rendert `—`, nie eine leere Liste. */
export type HandFlags = Measurement<{ rows: HandFlag[] }>;

function handFlagsPath(): string {
  return path.join(dataDir(), "reports", "hand-flags.jsonl");
}

/** Die Behauptung des Modells absteigend: die sicherste Verdeckung zuerst. */
export function loadHandFlags(): Promise<HandFlags> {
  return loadMeasurement(handFlagsPath(), parse);
}

function parse(lines: Record<string, unknown>[]): { rows: HandFlag[] } {
  const rows: HandFlag[] = [];
  for (const o of lines) {
    // Die Kopfzeile trägt `_cut`/`_written_at` und kein `square` — sie ist kein Flag.
    if (typeof o.session_id !== "string" || typeof o.square !== "string") continue;
    // `cov`: Schreibweise vor 2026-09-16, hiess im Nachbarbericht das Gegenteil.
    const modelCov = typeof o.model_cov === "number" ? o.model_cov : o.cov;
    if (typeof modelCov !== "number") continue;
    // `measured`: SERIALISIERT von `hand_flags.py` vor 2026-09-16 — der Schluessel auf der
    // Platte bleibt, nur der TS-Name wanderte auf `matte_cov`.
    const matteCov = typeof o.matte_cov === "number" ? o.matte_cov : o.measured;
    rows.push({
      session_id: o.session_id,
      frame: String(o.frame),
      square: o.square,
      fen_label: String(o.fen_label ?? ""),
      model_cov: modelCov,
      matte_cov: typeof matteCov === "number" ? matteCov : null,
    });
  }
  rows.sort((a, b) => b.model_cov - a.model_cov);
  return { rows };
}
