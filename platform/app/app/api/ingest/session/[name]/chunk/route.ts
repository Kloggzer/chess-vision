import { appendChunk, authorized } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One chunk, appended at `offset`. The body is streamed to disk — a QHD recording is a gigabyte,
 * and buffering a chunk per request is the difference between a steady 8 MiB and the whole file in
 * the server's heap.
 *
 * A wrong offset is answered with 409 and the true length instead of a write, which is what makes
 * a resumed transfer self-correcting: the client seeks to what the server has and continues.
 */
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
