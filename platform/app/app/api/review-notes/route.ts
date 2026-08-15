import { appendReviewNotes, validateNote } from "@/lib/review-notes";

/** A verdict, never a label: nothing here reaches `corrections.jsonl` (CONCEPT.md 8c). */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown };
    const rows = Array.isArray(body.rows) ? body.rows.map(validateNote) : [];
    return Response.json({ written: await appendReviewNotes(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
