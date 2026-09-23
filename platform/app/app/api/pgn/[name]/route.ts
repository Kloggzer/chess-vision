import { Contested } from "@/lib/atomic";
import { PyWorkerDown } from "@/lib/py/worker";
import { ReferenceRefused, saveReference } from "@/lib/session-store/reference";

/** Upload `reference.pgn`; ersetzt nur mit `?replace=1`. Die Schutzregeln stehen in `saveReference`. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const replace = new URL(request.url).searchParams.get("replace") === "1";
  try {
    return Response.json(await saveReference(name, await request.text(), replace));
  } catch (error) {
    if (error instanceof Contested || error instanceof ReferenceRefused) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof PyWorkerDown) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
