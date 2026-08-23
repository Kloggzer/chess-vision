/** `data/reports/hand-flags.jsonl` (READ ONLY), von `chesslab realgames hand-flags`: Zellen, die
 *  der Occlusion-Kopf für verdeckt hält und die Matte für frei. Eigene Lane statt Audit, weil dort
 *  Klassen entschieden werden und `occluded` gemessen statt gelabelt ist (`audit-flags.ts`). */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/data";

export type HandFlag = {
  session_id: string;
  frame: string;
  square: string;
  fen_label: string;
  /** Was der Occlusion-Kopf behauptet (0..1). */
  cov: number;
  /** Was die Matte gemessen hat, oder `null` — dann hat sie dieses Frame nie gesehen. */
  measured: number | null;
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
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      // Die Kopfzeile trägt `_cut`/`_written_at` und kein `square` — sie ist kein Flag.
      if (typeof o.session_id !== "string" || typeof o.square !== "string") continue;
      if (typeof o.cov !== "number") continue;
      rows.push({
        session_id: o.session_id,
        frame: String(o.frame),
        square: o.square,
        fen_label: String(o.fen_label ?? ""),
        cov: o.cov,
        measured: typeof o.measured === "number" ? o.measured : null,
      });
    } catch {
      /* eine halb geschriebene Zeile ist kein Flag */
    }
  }
  rows.sort((a, b) => b.cov - a.cov);
  const value: HandFlags = { rows, present: true };
  cache.set(file, { key, value });
  return value;
}
