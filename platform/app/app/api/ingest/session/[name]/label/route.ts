import { claimHeavyLock, lockRefusal, releaseAfter, releaseHeavyLock } from "@/lib/chain/heavy-lock";
import { enqueueLabel } from "@/lib/chain/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Der ausdrueckliche Rueckfall, durch dieselbe Tuer wie `startStep`: ein Replay haelt ~6 GB, und
 *  ohne den Riegel startete dieser Knopf ihn neben dem Python-Lauf, den `heavy.lock` haelt. */
export async function POST(_request: Request, ctx: RouteContext<"/api/ingest/session/[name]/label">) {
  const { name } = await ctx.params;
  try {
    const refusal = lockRefusal(await claimHeavyLock("label", name));
    if (refusal) return Response.json({ error: refusal }, { status: 409 });
    const job = await enqueueLabel(name).catch(releaseAfter);
    // `enqueueLabel` gibt einen VORHANDENEN Job zurueck, statt einzureihen — ein 202 darauf
    // meldete "gestartet", waehrend nichts lief, und hielt den Riegel dabei fest.
    if (job.kind !== "label") {
      await releaseHeavyLock();
      return Response.json({ error: `${name}: ${job.kind} laeuft bereits (${job.state})` }, { status: 409 });
    }
    return Response.json(job, { status: 202 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
