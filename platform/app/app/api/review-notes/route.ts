import { adoptDirty } from "@/lib/adopt-dirty";
import { recordingName } from "@/lib/session";
import { appendReviewNotes, dropReviewNotes, validateNote } from "@/lib/review-notes";

/** A verdict, never a label: nothing here reaches `corrections.jsonl` (CONCEPT.md 8c). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown; retract?: unknown };
    if (!Array.isArray(body.rows)) throw new Error("rows fehlt oder ist kein Array");
    const rows = body.rows.map(validateNote);
    const retract = body.retract === true;
    const written = retract ? await dropReviewNotes(rows) : await appendReviewNotes(rows);
    // Melden UND Widerrufen stossen denselben Lauf an: er gleicht das Log gegen die Notizen ab,
    // in beide Richtungen. Gewartet wird nur auf den START; das Laufzeit-Ergebnis steht im Ledger.
    const names = [...new Set(rows.flatMap((r) => (r.verdict === "dirty-frame" ? [recordingName(r.session_id)] : [])))];
    const starts = await Promise.all(names.map(async (name) => ({ name, ...(await adoptDirty(name)) })));
    const adoptFailed = starts.flatMap((s) => (s.started ? [] : [`adopt-dirty ${s.name}: ${s.error}`]));
    return Response.json(retract && names.length === 0 ? { written } : { written, adoptFailed });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
