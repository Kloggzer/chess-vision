import { appendUnusableCells, validateCell } from "@/lib/unusable-cells";

/**
 * „Aus diesem Crop ist kein Label zu holen" — ein eigenes Ledger neben `corrections.jsonl`, weil
 * dort jede Zeile eine der 13 Identitaeten ist und Leser das voraussetzen duerfen.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown };
    if (!Array.isArray(body.rows)) throw new Error("rows fehlt oder ist kein Array");
    const rows = body.rows.map(validateCell);
    return Response.json({ written: await appendUnusableCells(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
