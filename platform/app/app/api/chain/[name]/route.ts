import { chainState } from "@/lib/chain/chain";
import { refused, startStep } from "@/lib/chain/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single interface: step checked against disk, not trusted (button can be stale).
export async function POST(request: Request, ctx: RouteContext<"/api/chain/[name]">) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json().catch(() => ({}))) as { step?: string; lens?: boolean };
    // `lens` passes UNTOUCHED: absent means "let the source decide" (`lensFor`). Ein fehlendes
    // `step` ist eine kaputte Anfrage, kein Konflikt — sonst stuende "undefined" in der 409.
    if (typeof body.step !== "string" || body.step === "") {
      return Response.json({ error: "step fehlt im Rumpf" }, { status: 400 });
    }
    const result = await startStep(name, body.step, body.lens);
    if (refused(result)) {
      return Response.json({ error: result.error, state: result.state }, { status: result.status });
    }
    return Response.json(result, { status: 202 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

/** What the card renders: where this game sits in the chain right now. */
export async function GET(_request: Request, ctx: RouteContext<"/api/chain/[name]">) {
  const { name } = await ctx.params;
  try {
    return Response.json(await chainState(name));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
