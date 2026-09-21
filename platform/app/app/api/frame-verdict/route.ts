import { flagFrame } from "@/lib/frame-flag";
import { appendReviewNotes, validateNote } from "@/lib/review-notes";
import { recordingName } from "@/lib/session";

/**
 * Das Urteil ueber ein ganzes FRAME, aus der Strittig-Lane: `matte` schickt es weiter (SAM holt
 * es mit `occluders alpha-worker --wanted`, danach sind seine Crops Sache der Zell-Lane),
 * `unusable` wirft es weg — das Flag im `log.jsonl`, das Slice und Matte beide ueberspringen.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { session_id?: unknown; frame?: unknown; verdict?: unknown };
    // `String(undefined)` ist "undefined", und `checkName` laesst das Wort durch: ein Koerper ohne
    // `session_id` schrieb so ein Urteil ueber Frame "undefined" der Sitzung "undefined" — mit 200.
    const session_id = text(body.session_id, "session_id");
    const name = recordingName(session_id);
    const frame = text(body.frame, "frame");
    if (body.verdict === "unusable") {
      return Response.json(await flagFrame(name, frame, true));
    }
    if (body.verdict !== "matte") throw new Error(`bad verdict: ${body.verdict}`);
    // Alte Zeilen tragen "Strittige Frames" — falsch, die Lane ruft hier nie an; nachtragen
    // koennen wir sie nicht, der Zettel ist das Protokoll.
    const rows = [validateNote({ session_id, frame, verdict: "matte-wanted", reason: "Labeln-Strom" })];
    return Response.json({ written: await appendReviewNotes(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

function text(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${what} fehlt im Rumpf`);
  return value;
}
