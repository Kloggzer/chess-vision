import { jsonBody, respond } from "@/lib/http-error";
import { loadMeta, saveMeta } from "@/lib/session-store/meta";

export async function GET(_request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  return respond(() => loadMeta(name));
}

/** Body: `{title?, archived?}` — a PATCH by intent; only the keys present are touched. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  return respond(async () => {
    const body = await jsonBody<{ title?: string; archived?: boolean }>(request);
    return await saveMeta(name, body);
  });
}
