import { BadRequest, jsonBody, respond } from "@/lib/http-error";
import { flagFrame } from "@/lib/session-store/frame-flag";
import { appendReviewNotes, validateNote } from "@/lib/session-store/review-notes";
import { recordingName } from "@/lib/session-store/session";

/**
 * Das Urteil ueber ein ganzes FRAME, aus der Strittig-Lane: `matte` schickt es weiter (SAM holt
 * es mit `occluders alpha-worker --wanted`, danach sind seine Crops Sache der Zell-Lane),
 * `unusable` wirft es weg — das Flag im `log.jsonl`, das Slice und Matte beide ueberspringen.
 */
export async function POST(request: Request) {
  return respond(async () => {
    const body = await jsonBody<{ session_id?: unknown; frame?: unknown; verdict?: unknown }>(request);
    // `String(undefined)` ist "undefined", und `checkName` laesst das Wort durch: ein Koerper ohne
    // `session_id` schrieb so ein Urteil ueber Frame "undefined" der Sitzung "undefined" — mit 200.
    const session_id = text(body.session_id, "session_id");
    const name = recordingName(session_id);
    const frame = text(body.frame, "frame");
    if (body.verdict === "unusable") {
      return await flagFrame(name, frame, true);
    }
    if (body.verdict !== "matte") throw new BadRequest(`bad verdict: ${body.verdict}`);
    // Alte Zeilen tragen "Strittige Frames" — falsch, die Lane ruft hier nie an; nachtragen
    // koennen wir sie nicht, der Zettel ist das Protokoll.
    const rows = [validateNote({ session_id, frame, verdict: "matte-wanted", reason: "Labeln-Strom" })];
    return { written: await appendReviewNotes(rows) };
  });
}

function text(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new BadRequest(`${what} fehlt im Rumpf`);
  return value;
}
