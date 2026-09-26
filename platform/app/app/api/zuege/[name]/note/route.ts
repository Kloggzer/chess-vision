import { BadRequest, jsonBody, respond } from "@/lib/http-error";
import { appendReviewNotes } from "@/lib/session-store/review-notes";
import { sessionId } from "@/lib/session-store/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A verdict about the PICTURE, never the move: nothing here touches `candidate.json`. The session
 *  id is derived from the recording's name, so a URL cannot name a foreign session. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  return respond(async () => {
    const body = await jsonBody<{ ply?: unknown; reason?: unknown }>(request);
    // `Number(null)` ist 0 und `Number(true)` ist 1: ein Koerper ohne `ply` landete sonst als
    // Urteil ueber Halbzug 0.
    const given = typeof body.ply === "number" || (typeof body.ply === "string" && body.ply.trim());
    const ply = given ? Number(body.ply) : Number.NaN;
    if (!Number.isInteger(ply) || ply < 0) throw new BadRequest(`bad ply: ${String(body.ply)}`);
    const reason = typeof body.reason === "string" && body.reason.trim() ? { reason: body.reason.trim() } : {};
    await appendReviewNotes([{ session_id: sessionId(name), ply, verdict: "bad-interval", ...reason }]);
    return { noted: true, session_id: sessionId(name), ply };
  });
}
