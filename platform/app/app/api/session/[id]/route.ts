import { deleteSession, deletionCost } from "@/lib/session-delete";

/**
 * Two steps of ONE verb: `{dryRun:true}` returns what would go, `{confirm:"<id>"}` deletes it. The
 * echoed id is the wire's guard; how DELIBERATE the confirmation is (typed, or one click) is the
 * dialog's call, because only it knows whether corrections are at stake.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/session/[id]">) {
  const { id } = await ctx.params;
  try {
    const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean; confirm?: string };
    if (body.dryRun) {
      const answer = await deletionCost(id);
      return "error" in answer ? Response.json(answer, { status: 400 }) : Response.json(answer.cost);
    }
    if (body.confirm !== id) return Response.json({ error: "confirm must repeat the session id" }, { status: 400 });
    const answer = await deleteSession(id);
    return "error" in answer ? Response.json(answer, { status: 400 }) : Response.json(answer);
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
