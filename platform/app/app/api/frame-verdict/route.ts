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
    const session_id = String(body.session_id);
    const name = recordingName(session_id);
    const frame = String(body.frame);
    if (body.verdict === "unusable") {
      return Response.json(await flagFrame(name, frame, true));
    }
    if (body.verdict !== "matte") throw new Error(`bad verdict: ${body.verdict}`);
    // TODO: `reason` luegt — einziger Aufrufer ist der Labeln-Strom, nicht die Strittig-Lane.
    const rows = [validateNote({ session_id, frame, verdict: "matte-wanted", reason: "Strittige Frames" })];
    return Response.json({ written: await appendReviewNotes(rows) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
