import { jobOf } from "@/lib/jobs";
import { progressOf } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The running job of this game, with what its log says it has reached. Polled by the card. */
export async function GET(_request: Request, ctx: RouteContext<"/api/chain/[name]/progress">) {
  const { name } = await ctx.params;
  try {
    // `jobs(100)` schnitt VOR dem Filter: hinter 120 neueren Zeilen las ein laufender Job der
    // gesuchten Aufnahme als idle, und die Seite bot den Knopf erneut an.
    const job = await jobOf(name);
    return Response.json({ job, progress: await progressOf(name, job?.log) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
