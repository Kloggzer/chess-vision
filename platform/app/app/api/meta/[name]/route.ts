import { loadMeta, saveMeta } from "@/lib/meta";

export async function GET(_request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    return Response.json(await loadMeta(name));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

/** Body: `{title?, archived?}` — a PATCH by intent; only the keys present are touched. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json()) as { title?: string; archived?: boolean };
    return Response.json(await saveMeta(name, body));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
