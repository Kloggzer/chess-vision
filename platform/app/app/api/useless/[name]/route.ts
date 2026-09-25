import { BadRequest, errorJson, jsonBody } from "@/lib/http-error";
import { chainState } from "@/lib/chain/chain";
import { readUseless, setUseless } from "@/lib/session-store/useless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Body: `{useless: boolean, reason?: string}`. Posts no job, only silences or restores the chain,
 *  so the answer is the new chain state. */
export async function POST(request: Request, ctx: RouteContext<"/api/useless/[name]">) {
  const { name } = await ctx.params;
  try {
    const body = await jsonBody<{ useless?: boolean; reason?: string }>(request);
    if (typeof body.useless !== "boolean") throw new BadRequest("useless must be a boolean");
    const flag = await setUseless(name, body.useless, body.reason);
    return Response.json({ flag, state: await chainState(name) });
  } catch (error) {
    return errorJson(error);
  }
}

/** The record on disk, an undone one included — the flag's own history. */
export async function GET(_request: Request, ctx: RouteContext<"/api/useless/[name]">) {
  const { name } = await ctx.params;
  try {
    return Response.json(await readUseless(name));
  } catch (error) {
    return errorJson(error);
  }
}
