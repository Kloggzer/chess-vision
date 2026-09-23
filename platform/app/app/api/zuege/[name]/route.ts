import { claimHeavyLock, releaseHeavyLock } from "@/lib/chain/heavy-lock";
import { writeConfirmation } from "@/lib/session-store/recordings";
import { enqueueChain, holdExport, releaseExportHold } from "@/lib/chain/jobs";
import { EXPORT_HOLD_MS } from "@/lib/label/zuege";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The ZÜGE stream's game boundary, in the three shapes it can take (CONCEPT.md §4.1.1).
 *
 * `commit` writes the buffered keeps AND enqueues the export it owns, held for 90 s; `undo` is `z`
 * across that boundary — it rewrites `reviewed_plies` and takes the held row back, and says
 * plainly when it could not, because then a session directory exists and only a re-export fixes
 * it; `reexport` is the button that sentence carries. `kept` stays what it always was: indices
 * into the candidate's own move list, turned into plies by the server.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json()) as { action?: string; kept?: unknown };
    const kept = (Array.isArray(body.kept) ? body.kept.filter((v) => Number.isInteger(v)) : []) as number[];

    if (body.action === "reexport") return await reexport(name);
    // `x` on a game whose boundary already committed: the hold has to go, but NOTHING may be
    // written into `candidate.json` — stamping a recording the human just rejected is what §4.1
    // forbids `x` to do.
    if (body.action === "release") return Response.json(await releaseExportHold(name));
    if (body.action === "undo") {
      const plies = await writeConfirmation(name, kept);
      const { dequeued } = await releaseExportHold(name);
      return Response.json({ reviewed_plies: plies, dequeued });
    }
    if (body.action !== "commit") return Response.json({ error: `unknown action: ${body.action}` }, { status: 400 });

    const plies = await writeConfirmation(name, kept);
    const held = await holdExport(name, EXPORT_HOLD_MS);
    return Response.json({ reviewed_plies: plies, notBefore: held.notBefore, holdMs: EXPORT_HOLD_MS });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

/** The same door `startStep` uses, minus its step check: the chain has moved past `export` by then. */
async function reexport(name: string): Promise<Response> {
  const lock = await claimHeavyLock("export", name);
  // Wie `startStep`: eine unlesbare Sperre ist die halb geschriebene eines LAUFENDEN Prozesses.
  if ("blocked" in lock) return Response.json({ error: lock.blocked }, { status: 409 });
  if ("foreign" in lock) {
    const { pid, job, name: holder } = lock.foreign;
    return Response.json({ error: `heavy.lock: pid ${pid} arbeitet an ${job} ${holder}` }, { status: 409 });
  }
  try {
    const job = await enqueueChain(name, "export");
    // `enqueueChain` gibt einen VORHANDENEN Job zurueck, statt einzureihen. Ein 202 darauf
    // meldete "Re-Export gestartet", waehrend nichts lief — und hielt den Heavy-Lock.
    if (job.kind !== "export") {
      await releaseHeavyLock().catch(() => undefined);
      return Response.json({ error: `${name}: ${job.kind} laeuft bereits (${job.state})` }, { status: 409 });
    }
    return Response.json(job, { status: 202 });
  } catch (error) {
    await releaseHeavyLock().catch(() => undefined);
    throw error;
  }
}
