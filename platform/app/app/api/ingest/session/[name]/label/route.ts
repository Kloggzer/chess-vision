import { claimHeavyLock, releaseHeavyLock } from "@/lib/heavy-lock";
import { enqueueLabel } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Der ausdrueckliche Rueckfall, durch dieselbe Tuer wie `startStep`: ein Replay haelt ~6 GB, und
 *  ohne den Riegel startete dieser Knopf ihn neben dem Python-Lauf, den `heavy.lock` haelt. */
export async function POST(_request: Request, ctx: RouteContext<"/api/ingest/session/[name]/label">) {
  const { name } = await ctx.params;
  try {
    const lock = await claimHeavyLock("label", name);
    if ("blocked" in lock) return Response.json({ error: lock.blocked }, { status: 409 });
    if ("foreign" in lock) {
      const { pid, job, name: holder } = lock.foreign;
      return Response.json({ error: `heavy.lock: pid ${pid} arbeitet an ${job} ${holder}` }, { status: 409 });
    }
    try {
      const job = await enqueueLabel(name);
      // `enqueueLabel` gibt einen VORHANDENEN Job zurueck, statt einzureihen — ein 202 darauf
      // meldete "gestartet", waehrend nichts lief, und hielt den Riegel dabei fest.
      if (job.kind !== "label") {
        await releaseHeavyLock().catch(() => undefined);
        return Response.json({ error: `${name}: ${job.kind} laeuft bereits (${job.state})` }, { status: 409 });
      }
      return Response.json(job, { status: 202 });
    } catch (error) {
      await releaseHeavyLock().catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
