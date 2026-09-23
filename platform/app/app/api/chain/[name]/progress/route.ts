import { jobOf } from "@/lib/chain/jobs";
import { progressOf } from "@/lib/chain/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The running job of this game, with what its log says it has reached. Polled by the card. */
export async function GET(_request: Request, ctx: RouteContext<"/api/chain/[name]/progress">) {
  const { name } = await ctx.params;
  try {
    const job = await jobOf(name);
    return Response.json({ job, progress: await progressOf(name, job?.log) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
