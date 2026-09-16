/** `data/reports/hand-flags.jsonl` (READ ONLY), von `chesslab realgames hand-flags`: Zellen, die
 *  der Occlusion-Kopf für verdeckt hält und die Matte für frei. Eigene Lane statt Audit, weil dort
 *  Klassen entschieden werden und `occluded` gemessen statt gelabelt ist (`audit-flags.ts`). */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";
import { jsonlRows } from "@/lib/jsonl";

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

export type HandFlags = {
  rows: HandFlag[];
  /** `false` = der Producer lief noch nicht; die Lane rendert `—`, nie eine leere Liste. */
  present: boolean;
};

export function handFlagsPath(): string {
  return path.join(dataDir(), "reports", "hand-flags.jsonl");
}

type Cache = Map<string, { key: string; value: HandFlags }>;
/** Angepinnt wie `lib/jobs.ts:56` — eine Modul-Map parst sonst bei jedem Hot Reload neu. */
const cache: Cache = ((globalThis as { __chesslabHandFlags?: Cache }).__chesslabHandFlags ??= new Map());

/** Die Behauptung des Modells absteigend: die sicherste Verdeckung zuerst. */
export async function loadHandFlags(): Promise<HandFlags> {
  const file = handFlagsPath();
  const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    const missing: HandFlags = { rows: [], present: false };
    cache.set(file, { key, value: missing });
    return missing;
  }

  const rows: HandFlag[] = [];
  for (const o of jsonlRows(text)) {
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
  const value: HandFlags = { rows, present: true };
  cache.set(file, { key, value });
  return value;
}
