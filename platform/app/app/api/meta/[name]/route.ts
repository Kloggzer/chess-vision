import { errorJson, jsonBody } from "@/lib/http-error";
import { loadMeta, saveMeta } from "@/lib/session-store/meta";

export async function GET(_request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    return Response.json(await loadMeta(name));
  } catch (error) {
    return errorJson(error);
  }
}

/** Body: `{title?, archived?}` — a PATCH by intent; only the keys present are touched. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = await jsonBody<{ title?: string; archived?: boolean }>(request);
    return Response.json(await saveMeta(name, body));
  } catch (error) {
    return errorJson(error);
  }
}
