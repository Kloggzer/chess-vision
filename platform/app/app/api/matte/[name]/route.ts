import { recutMatte } from "@/lib/matte-fix";

/**
 * `chesslab occluders recut <name>` from the UI — the one verb that turns painted pixels into
 * coverage. Nothing is computed here; this file spawns and reports its last line.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json().catch(() => ({}))) as { recut?: boolean };
    if (!body.recut) throw new Error("body must be {recut:true}");
    return Response.json(await recutMatte(name));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
