import { appendChunk, authorized } from "@/lib/ingest/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streamed to disk — buffering a chunk per request would put the whole gigabyte in the heap. A wrong
 *  offset gets 409 and the true length instead of a write: the client seeks to it and continues. */
export async function PUT(request: Request, ctx: RouteContext<"/api/ingest/session/[name]/chunk">) {
  if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });
  const { name } = await ctx.params;
  const url = new URL(request.url);
  const relPath = url.searchParams.get("path") ?? "";
  const offset = Number(url.searchParams.get("offset") ?? "-1");
  try {
    return Response.json(await appendChunk(name, relPath, offset, request.body));
  } catch (error) {
    const conflict = error as { conflict?: boolean; have?: number };
    if (conflict.conflict) return Response.json({ error: String(error), have: conflict.have }, { status: 409 });
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
