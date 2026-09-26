import { claimHeavyLock, lockRefusal, releaseAfter } from "@/lib/chain/heavy-lock";
import { Conflict, jsonBody, respond } from "@/lib/http-error";
import { writeConfirmation } from "@/lib/session-store/recordings";
import { enqueueChain, holdExport, releaseExportHold } from "@/lib/chain/jobs";
import { EXPORT_HOLD_MS } from "@/lib/label/zuege";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `commit` writes the keeps AND enqueues the export, held for 90 s; `undo` takes the held row back
 *  and says plainly when it could not — then only a re-export fixes it; `reexport` is that button.
 *  `kept` are indices into the candidate's move list, turned into plies by the server. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  return respond(async () => {
    const body = await jsonBody<{ action?: string; kept?: unknown }>(request);
    const kept = (Array.isArray(body.kept) ? body.kept.filter((v) => Number.isInteger(v)) : []) as number[];

    if (body.action === "reexport") return await reexport(name);
    // `x` after the boundary committed: the hold has to go, but NOTHING may be written into
    // `candidate.json` for a recording the human just rejected.
    if (body.action === "release") return await releaseExportHold(name);
    if (body.action === "undo") {
      const plies = await writeConfirmation(name, kept);
      const { dequeued } = await releaseExportHold(name);
      return { reviewed_plies: plies, dequeued };
    }
    if (body.action !== "commit") return Response.json({ error: `unknown action: ${body.action}` }, { status: 400 });

    const plies = await writeConfirmation(name, kept);
    const held = await holdExport(name, EXPORT_HOLD_MS);
    return { reviewed_plies: plies, notBefore: held.notBefore, holdMs: EXPORT_HOLD_MS };
  });
}

/** The same door `startStep` uses, minus its step check: the chain has moved past `export` by then. */
async function reexport(name: string): Promise<Response> {
  // Wie `startStep`: eine unlesbare Sperre ist die halb geschriebene eines LAUFENDEN Prozesses.
  const refusal = lockRefusal(await claimHeavyLock("export", name));
  if (refusal) throw new Conflict(refusal);
  const job = await enqueueChain(name, "export").catch(releaseAfter);
  // `enqueueChain` gibt einen VORHANDENEN Job zurueck, statt einzureihen. Ein 202 darauf
  // meldete "Re-Export gestartet", waehrend nichts lief — und hielt den Heavy-Lock.
  if (job.kind !== "export") return releaseAfter(new Conflict(`${name}: ${job.kind} laeuft bereits (${job.state})`));
  return Response.json(job, { status: 202 });
}
