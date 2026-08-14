import { adoptPgn, chainState } from "@/lib/chain";
import { enqueueChain, enqueueLabel } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One door for the chain's four steps, so the UI posts a STEP and never a command line.
 *
 * The step is checked against the disk rather than trusted: a button can be stale (a second tab, a
 * job that finished while the page sat open), and running `export-session` on an unconfirmed
 * candidate writes an empty session that looks like a failure of the recording.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/chain/[name]">) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json().catch(() => ({}))) as { step?: string; lens?: boolean };
    const state = await chainState(name);
    if (body.step === "adopt-pgn") return Response.json(await adoptPgn(name));
    // The flag is the whole reason there is no step; running one anyway would be the one thing
    // the user asked for it to prevent.
    if (state.step === null) {
      return Response.json({ error: "als nutzlos markiert — kein Schritt läuft", state }, { status: 409 });
    }
    if (body.step !== state.step) {
      return Response.json({ error: `next step is "${state.step}", not "${body.step}"`, state }, { status: 409 });
    }
    // Passed through UNTOUCHED: absent means "let the source decide" (`lensFor`), and the old
    // `body.lens !== false` turned every ordinary press back into an explicit `lens: true`, which
    // is exactly the refusal the automation exists to avoid.
    if (state.step === "label") return Response.json(await enqueueLabel(name, body.lens), { status: 202 });
    if (state.step === "export" || state.step === "propose") {
      return Response.json(await enqueueChain(name, state.step), { status: 202 });
    }
    return Response.json({ error: `"${state.step}" is a page, not a job`, state }, { status: 400 });
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
