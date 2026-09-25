import { errorJson } from "@/lib/http-error";
import { recutMatte } from "@/lib/chain/matte-edit";

/**
 * `chesslab occluders recut <name>` from the UI — the one verb that turns painted pixels into
 * coverage. Nothing is computed here; this file spawns and reports its last line.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { recut?: boolean } | null;
  if (!body?.recut) return Response.json({ error: "body must be {recut:true}" }, { status: 400 });
  try {
    return Response.json(await recutMatte(name));
  } catch (error) {
    return errorJson(error);
  }
}
