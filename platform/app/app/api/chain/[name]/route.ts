import { chainState } from "@/lib/chain";
import { refused, startStep } from "@/lib/chain-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Single interface: step checked against disk, not trusted (button can be stale).
export async function POST(request: Request, ctx: RouteContext<"/api/chain/[name]">) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json().catch(() => ({}))) as { step?: string; lens?: boolean };
    // `lens` is passed through UNTOUCHED: absent means "let the source decide" (`lensFor`), and the
    // old `body.lens !== false` turned every ordinary press back into an explicit `lens: true`,
    // which is exactly the refusal the automation exists to avoid.
    // TODO: Ein fehlendes `step` wird zur Zeichenkette "undefined" und steht so in der 409-Meldung.
    const result = await startStep(name, String(body.step), body.lens);
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
