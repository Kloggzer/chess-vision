import { appendCorrections, type Ledger, validate } from "@/lib/session-store/corrections";

/** The human's verdicts, appended verbatim. One request = one flush, no cross-request buffer. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rows?: unknown; ledger?: unknown };
    // Ohne `rows` meinte der Client etwas anderes, als die Route tut; `written: 0` unter 200
    // liest sich beim Aufrufer als "geschrieben".
    if (!Array.isArray(body.rows)) throw new Error("rows fehlt oder ist kein Array");
    const rows = body.rows.map(validate);
    // Anything but the explicit "reviewed" lands in the training input — an unknown value must
    // not silently divert rows away from the file that matters.
    const ledger: Ledger = body.ledger === "reviewed" ? "reviewed" : "corrections";
    return Response.json({ written: await appendCorrections(rows, ledger) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
