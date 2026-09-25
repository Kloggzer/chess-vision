/** Die eine Abbildung Fehler -> HTTP fuer die Routen: Eingabe 400, "nicht da" 404, Konflikt 409,
 *  alles andere 500 — auch jeder `PyOpFailed` und `PyWorkerDown`, die ein Service nicht uebersetzt. */
import { Contested } from "@/lib/atomic";
import { isMissing } from "@/lib/measurement";

/** Die Anfrage selbst ist falsch; die einzige Quelle einer 400. */
export class BadRequest extends Error {}

export function errorStatus(error: unknown): number {
  if (error instanceof BadRequest) return 400;
  if (isMissing(error)) return 404;
  if (error instanceof Contested) return 409;
  return 500;
}

export const errorJson = (error: unknown): Response =>
  Response.json({ error: error instanceof Contested ? error.message : String(error) }, { status: errorStatus(error) });

export const errorText = (error: unknown): Response => new Response(String(error), { status: errorStatus(error) });

/** Ein Rumpf ohne JSON ist ein Fehler des Clients, kein `SyntaxError` des Servers. */
export async function jsonBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch (error) {
    throw new BadRequest(`Rumpf ist kein JSON: ${String(error)}`);
  }
}
