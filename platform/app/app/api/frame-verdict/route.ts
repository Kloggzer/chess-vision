import { flagFrame } from "@/lib/frame-flag";
import { appendReviewNotes, dropReviewNotes, validateNote } from "@/lib/review-notes";
import { recordingName } from "@/lib/session";

/**
 * Das Urteil ueber ein ganzes FRAME, aus der Strittig-Lane: `matte` schickt es weiter (SAM holt
 * es mit `occluders alpha-worker --wanted`, danach sind seine Crops Sache der Zell-Lane),
 * `unusable` wirft es weg — das Flag im `log.jsonl`, das Slice und Matte beide ueberspringen.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { session_id?: unknown; frame?: unknown; verdict?: unknown; retract?: unknown };
    const session_id = String(body.session_id);
    const name = recordingName(session_id);
    const frame = String(body.frame);
    const retract = body.retract === true;
    if (body.verdict === "unusable") {
      return Response.json(await flagFrame(name, frame, !retract));
    }
    if (body.verdict !== "matte") throw new Error(`bad verdict: ${body.verdict}`);
    const rows = [validateNote({ session_id, frame, verdict: "matte-wanted", reason: "Strittige Frames" })];
    return Response.json({ written: retract ? await dropReviewNotes(rows) : await appendReviewNotes(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
