import { BadRequest, errorJson, jsonBody } from "@/lib/http-error";
import { appendCorrections, type Ledger, validate } from "@/lib/session-store/corrections";

/** The human's verdicts, appended verbatim. One request = one flush, no cross-request buffer. */
export async function POST(request: Request) {
  try {
    const body = await jsonBody<{ rows?: unknown; ledger?: unknown }>(request);
    // Ohne `rows` meinte der Client etwas anderes, als die Route tut; `written: 0` unter 200
    // liest sich beim Aufrufer als "geschrieben".
    if (!Array.isArray(body.rows)) throw new BadRequest("rows fehlt oder ist kein Array");
    const rows = body.rows.map(validate);
    // Anything but the explicit "reviewed" lands in the training input — an unknown value must
    // not silently divert rows away from the file that matters.
    const ledger: Ledger = body.ledger === "reviewed" ? "reviewed" : "corrections";
    return Response.json({ written: await appendCorrections(rows, ledger) });
  } catch (error) {
    return errorJson(error);
  }
}
