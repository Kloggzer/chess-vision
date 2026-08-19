import { appendReviewNotes, dropReviewNotes, validateNote } from "@/lib/review-notes";

/** A verdict, never a label: nothing here reaches `corrections.jsonl` (CONCEPT.md 8c). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown; retract?: unknown };
    const rows = Array.isArray(body.rows) ? body.rows.map(validateNote) : [];
    if (body.retract === true) return Response.json({ written: await dropReviewNotes(rows) });
    return Response.json({ written: await appendReviewNotes(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
