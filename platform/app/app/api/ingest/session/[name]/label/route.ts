import { enqueueLabel } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start the explicit fallback for a recording that arrived without a phone game record. */
export async function POST(_request: Request, ctx: RouteContext<"/api/ingest/session/[name]/label">) {
  const { name } = await ctx.params;
  try {
    return Response.json(await enqueueLabel(name), { status: 202 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
