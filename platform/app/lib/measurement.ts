/**
 * Die eine Tuer fuer eine MESSDATEI. „Nicht gemessen" ist etwas anderes als „gemessen null", und
 * ein Lesefehler ist keins von beidem — fuenf Geschwister-Leser beantworteten das je fuer sich und
 * meldeten am 2026-09-21 jeden Fehler als „nie gelaufen", gecacht bis zur naechsten mtime.
 */
import { readFile, stat } from "node:fs/promises";
import { jsonlRowsStrict } from "@/lib/jsonl";

/** Zwei Arme, nicht drei: `rows: []` und „der Producer lief nie" sind nicht mehr frei
 *  kombinierbar. Ein dritter Arm `unreadable` macht aus dem Fehler wieder einen WERT, den ein
 *  `!== "measured"` genauso schluckt wie das blanke `catch {}`. Unlesbar WIRFT. */
export type Measurement<T> =
  | { readonly measured: false }
  | { readonly measured: true; readonly value: T };

const MISSING: Measurement<never> = { measured: false };

const measurementOf = <T>(value: T): Measurement<T> => ({ measured: true, value });

/** Nur ENOENT heisst „nicht da" — die Routen machen daraus 404, jeden anderen Fehler 500. */
export const isMissing = (error: unknown): boolean => (error as { code?: string })?.code === "ENOENT";

/** Jeder andere Fehler gehoert dem Aufrufer — als `null` gemeldet sieht eine Stoerung aus wie
 *  eine fehlende Datei. Als `.catch(absentOnly)` hinter jedes Lesen. */
export function absentOnly(error: unknown): null {
  if ((error as { code?: string })?.code !== "ENOENT") throw error;
  return null;
}

/** Da oder nicht da, `false` nur bei ENOENT: ein EACCES auf `candidate.json` startete sonst das
 *  Werkzeug, das menschliche Bestaetigungen neu schreibt. */
export async function exists(file: string): Promise<boolean> {
  return (await stat(file).catch(absentOnly)) !== null;
}

/**
 * Der Stempel einer Messdatei, `null` nur wenn sie FEHLT. Ein `stat`, das jeden Fehler auf
 * "keine Datei" abschneidet, springt am ENOENT-Griff des Lesers vorbei: EMFILE unter dem
 * Aufnahme-Faecher wurde so zur leeren Messung, gecacht bis zur naechsten mtime.
 */
export async function stampOrMissing(file: string): Promise<string | null> {
  const s = await stat(file).catch(absentOnly);
  return s === null ? null : `${s.mtimeMs}:${s.size}`;
}

type Entry = { key: string; value: Measurement<unknown> };
type Cache = Map<string, Entry>;
/** Angepinnt wie `lib/chain/slot.ts` — eine Modul-Map parst sonst bei jedem Hot Reload neu. */
const cache: Cache = ((globalThis as { __chesslabMeasurements?: Cache }).__chesslabMeasurements ??= new Map());

/** Nur fuer Tests: die Leser sind mtime-gekeyt, ein Fixture kann in dieselbe ms fallen. */
export function clearMeasurementCache(): void {
  cache.clear();
}

/**
 * Mtime-gekeyt wie jeder Leser davor. `salt` traegt einen zweiten Stempel in den Schluessel —
 * `lib/reports/audit-flags.ts` gilt als veraltet, sobald eine Matte JUENGER ist als die Flags.
 */
export async function loadMeasurement<T>(
  file: string,
  parse: (rows: Record<string, unknown>[]) => T,
  salt = "",
): Promise<Measurement<T>> {
  const key = `${salt}|${(await stampOrMissing(file)) ?? "none"}`;
  const hit = cache.get(file);
  if (hit?.key === key) return hit.value as Measurement<T>;

  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (e) {
    // Nur ENOENT heisst „der Producer lief nie"; die Lane schreibt dafuer `—`. Jeder ANDERE
    // Fehler ist ein Fehler — als `missing` gemeldet waere eine unlesbare Datei eine Aussage.
    if (!isMissing(e)) throw e;
    cache.set(file, { key, value: MISSING });
    return MISSING;
  }

  const value = measurementOf(parse(jsonlRowsStrict(file, text)));
  cache.set(file, { key, value });
  return value;
}
