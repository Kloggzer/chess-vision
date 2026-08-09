import { appendCorrections, type Ledger, validate } from "@/lib/corrections";

/** The human's verdicts, appended verbatim. One request = one flush, no cross-request buffer. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown; ledger?: unknown };
    const rows = Array.isArray(body.rows) ? body.rows.map(validate) : [];
    // Anything but the explicit "reviewed" lands in the training input — an unknown value must
    // not silently divert rows away from the file that matters.
    const ledger: Ledger = body.ledger === "reviewed" ? "reviewed" : "corrections";
    return Response.json({ written: await appendCorrections(rows, ledger) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
