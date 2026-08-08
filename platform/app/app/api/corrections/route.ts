import { appendCorrections, validate } from "@/lib/corrections";

/** The human's verdicts, appended verbatim. One request = one flush, no cross-request buffer. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown };
    const rows = Array.isArray(body.rows) ? body.rows.map(validate) : [];
    return Response.json({ written: await appendCorrections(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
