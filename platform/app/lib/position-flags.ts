/** `data/reports/position-flags.jsonl` (READ ONLY), von `chesslab realgames position-flags`:
 *  Zellen, deren Bild von der Stellung abweicht, für die ihr Intervall bürgt. Eigene Lane, weil
 *  die Frage weder „liegt eine Hand drauf" (`hand-flags.ts`) noch „hat das Modell recht" ist. */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";

export type PositionFlag = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  /** Abstand zum gesetzten Brett des Intervalls (`labeling.SETTLE_LIMIT` ist die Schwelle). */
  dev: number;
  /** Was die Matte für dieses Feld gemessen hat — unter der Sichtbarkeitsgrenze, sonst kein Flag. */
  matte_cov: number;
  /** `changed` = das Bild ist ein anderes; `unreadable` = zu wenig Feld war überhaupt zu sehen. */
  reason: string;
  /** SAM-free residual relative to reference contrast; not a coverage fraction. */
  temporal_score?: number;
};

export type PositionFlags = {
  rows: PositionFlag[];
  /** `false` = der Producer lief noch nicht; die Lane rendert `—`, nie eine leere Liste. */
  present: boolean;
};

export function positionFlagsPath(): string {
  return path.join(dataDir(), "reports", "position-flags.jsonl");
}

type Cache = Map<string, { key: string; value: PositionFlags }>;
/** Angepinnt wie `lib/hand-flags.ts` — eine Modul-Map parst sonst bei jedem Hot Reload neu. */
const cache: Cache = ((globalThis as { __chesslabPositionFlags?: Cache }).__chesslabPositionFlags ??= new Map());

/** Die größte Abweichung zuerst: dort ist am ehesten wirklich etwas anderes im Bild. */
export async function loadPositionFlags(): Promise<PositionFlags> {
  const file = positionFlagsPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    const missing: PositionFlags = { rows: [], present: false };
    cache.set(file, { key, value: missing });
    return missing;
  }

  const rows: PositionFlag[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      // Die Kopfzeile trägt die Schwellen und kein `square` — sie ist kein Flag.
      if (typeof o.session_id !== "string" || typeof o.square !== "string") continue;
      if (typeof o.dev !== "number") continue;
      rows.push({
        session_id: o.session_id,
        frame: String(o.frame),
        square: o.square,
        fen_label: String(o.fen_label ?? ""),
        dev: o.dev,
        // `cov`: Schreibweise vor 2026-09-16, hiess im Nachbarbericht das Gegenteil.
        matte_cov: typeof o.matte_cov === "number" ? o.matte_cov
          : typeof o.cov === "number" ? o.cov : 0,
        reason: String(o.reason ?? "changed"),
        ...(typeof o.temporal_score === "number" && Number.isFinite(o.temporal_score)
          ? { temporal_score: o.temporal_score } : {}),
      });
    } catch {
      /* eine halb geschriebene Zeile ist kein Flag */
    }
  }
  rows.sort((a, b) => b.dev - a.dev);
  const value: PositionFlags = { rows, present: true };
  cache.set(file, { key, value });
  return value;
}
