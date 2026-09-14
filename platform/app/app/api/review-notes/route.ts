import { adoptDirty } from "@/lib/adopt-dirty";
import { recordingName } from "@/lib/session";
import { appendReviewNotes, dropReviewNotes, validateNote } from "@/lib/review-notes";

/** A verdict, never a label: nothing here reaches `corrections.jsonl` (CONCEPT.md 8c). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown; retract?: unknown };
    if (!Array.isArray(body.rows)) throw new Error("rows fehlt oder ist kein Array");
    const rows = body.rows.map(validateNote);
    if (body.retract === true) return Response.json({ written: await dropReviewNotes(rows) });
    const written = await appendReviewNotes(rows);
    // Die gemeldete Hand ist erst auf dem Stapel, wenn sie im Log steht — und das ist billig, also
    // muss niemand dafür einen Knopf suchen. SAM 3 bleibt ein Knopf, das kostet Rechenzeit.
    // TODO: Surface adopt-dirty launch failures; 200 currently proves only the note append.
    for (const name of new Set(rows.flatMap((r) => (r.verdict === "dirty-frame" ? [recordingName(r.session_id)] : [])))) {
      adoptDirty(name);
    }
    return Response.json({ written });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
