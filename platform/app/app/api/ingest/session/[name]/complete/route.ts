import { authorized, complete } from "@/lib/ingest/ingest";
import { enqueuePack } from "@/lib/chain/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Seal the transfer and put the chain in the queue.
 *
 * The pack is queued, never awaited: it runs for minutes and the phone is holding a request open.
 * A held (duplicate) transfer queues nothing — the session already on this machine is the one whose
 * pack counts.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/ingest/session/[name]/complete">) {
  if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });
  const { name } = await ctx.params;
  try {
    const row = await complete(name);
    const job = row.status === "landed" ? await enqueuePack(row.name) : null;
    return Response.json({ ...row, job: job?.state ?? "none" });
  } catch (error) {
    const conflict = error as { conflict?: boolean; missing?: unknown };
    if (conflict.conflict) return Response.json({ error: String(error), missing: conflict.missing }, { status: 409 });
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
