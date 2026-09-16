import { queryCorpus } from "@/lib/corpus-query";
import { DEFAULT_WALL } from "@/lib/query";

/**
 * The corpus-wide identity question — `api/filter/[name]` grown to every session, for the LABELN
 * stream's `Klassenwand`. A class query is unanswerable in the browser because `StreamCell` carries
 * no `probs` and must not: that is 58 MB. The answer is cell keys, their reads and what ⏎ agrees to.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  // `?min=` ist leer, nicht null: `??` greift nicht und `Number("")` ist 0 — die Wand fiele still
  // auf "alles zaehlt" zurueck.
  const raw = params.get("min")?.trim();
  const min = raw ? Number(raw) : DEFAULT_WALL.min;
  try {
    if (!Number.isFinite(min)) throw new Error(`bad min: ${params.get("min")}`);
    const filter = { klass: params.get("class") ?? DEFAULT_WALL.klass, min };
    return Response.json(await queryCorpus(filter, params.get("phase") ?? "any"));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
