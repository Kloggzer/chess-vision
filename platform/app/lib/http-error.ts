/** Die eine Abbildung Fehler -> HTTP fuer die Routen: Eingabe 400, "nicht da" 404, Konflikt 409,
 *  alles andere 500 — auch jeder `PyOpFailed` und `PyWorkerDown`, die ein Service nicht uebersetzt. */
import { Contested } from "@/lib/atomic";
import { isMissing } from "@/lib/measurement";

/** Die Anfrage selbst ist falsch; die einzige Quelle einer 400. */
export class BadRequest extends Error {}

/** Die angefragte Sache gibt es nicht (Aufnahme, Frame) — 404 wie ein ENOENT. */
export class NotFound extends Error {}

/** Die Anfrage stimmt, aber laufende Arbeit schliesst sie gerade aus (Slot, Sperre) — 409. */
export class Conflict extends Error {}

/** Nur Pythons `Missing` (die angefragte Aufnahme/Frame/Kandidat fehlt), nie ein nackter
 *  `FileNotFoundError` — der ist eine interne Datei und damit 500. Strukturell: Kern importiert kein `py/`. */
const pythonMissing = (error: unknown): boolean =>
  error instanceof Error && (error as { kind?: unknown }).kind === "Missing";

export function errorStatus(error: unknown): number {
  if (error instanceof BadRequest) return 400;
  if (error instanceof NotFound || isMissing(error) || pythonMissing(error)) return 404;
  if (error instanceof Contested || error instanceof Conflict) return 409;
  return 500;
}

export const errorJson = (error: unknown): Response => Response.json(
  { error: error instanceof Contested || error instanceof Conflict ? error.message : String(error) },
  { status: errorStatus(error) });

export const errorText = (error: unknown): Response => new Response(String(error), { status: errorStatus(error) });

/** Der Rumpf einer Route: ein Wert wird JSON, eine fertige `Response` geht durch, jeder Wurf ueber die Regel. */
export async function respond(work: () => unknown, onError: (error: unknown) => Response = errorJson): Promise<Response> {
  try {
    const value = await work();
    return value instanceof Response ? value : Response.json(value);
  } catch (error) {
    return onError(error);
  }
}

/** Ein Rumpf ohne JSON ist ein Fehler des Clients, kein `SyntaxError` des Servers. */
export async function jsonBody<T>(request: Request): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new BadRequest(`Rumpf ist kein JSON: ${String(error)}`);
  }
  if (typeof body !== "object" || body === null) throw new BadRequest("Rumpf ist kein JSON-Objekt");
  return body as T;
}
