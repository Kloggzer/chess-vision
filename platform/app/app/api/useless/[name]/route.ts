import { chainState } from "@/lib/chain";
import { readUseless, setUseless } from "@/lib/useless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Body: `{useless: boolean, reason?: string}` — the human's verdict, and its undo.
 *
 * A sibling of `/api/chain/[name]` rather than a step of it: this posts no job and runs no
 * command, it only silences (or restores) the chain, so the answer is the new chain state the
 * card re-renders from.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/useless/[name]">) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json()) as { useless?: boolean; reason?: string };
    if (typeof body.useless !== "boolean") throw new Error("useless must be a boolean");
    const flag = await setUseless(name, body.useless, body.reason);
    return Response.json({ flag, state: await chainState(name) });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

/** The record on disk, an undone one included — the flag's own history. */
export async function GET(_request: Request, ctx: RouteContext<"/api/useless/[name]">) {
  const { name } = await ctx.params;
  try {
    return Response.json(await readUseless(name));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
