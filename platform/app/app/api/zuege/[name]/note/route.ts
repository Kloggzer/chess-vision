import { appendReviewNotes } from "@/lib/review-notes";
import { sessionId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Das Intervall taugt nichts" on one card (§8c).
 *
 * A verdict about the PICTURE, never about the move: the ply stays keepable and nothing here
 * touches `candidate.json`. It lands in `review-notes.jsonl`, which no Python reads — the session
 * id is derived from the recording's name so a URL cannot name a foreign session.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json()) as { ply?: unknown; reason?: unknown };
    // `Number(null)` ist 0 und `Number(true)` ist 1: ein Koerper ohne `ply` landete sonst als
    // Urteil ueber Halbzug 0.
    const given = typeof body.ply === "number" || (typeof body.ply === "string" && body.ply.trim());
    const ply = given ? Number(body.ply) : Number.NaN;
    if (!Number.isInteger(ply) || ply < 0) throw new Error(`bad ply: ${String(body.ply)}`);
    const reason = typeof body.reason === "string" && body.reason.trim() ? { reason: body.reason.trim() } : {};
    await appendReviewNotes([{ session_id: sessionId(name), ply, verdict: "bad-interval", ...reason }]);
    return Response.json({ noted: true, session_id: sessionId(name), ply });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
