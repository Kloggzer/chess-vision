import { writeConfirmation } from "@/lib/data";

/** The human's verdict: which unmatched candidate plies survive. The plies list is recomputed
 *  server-side from the file — the client only ever names the indices it kept. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json()) as { kept?: unknown };
    const kept = Array.isArray(body.kept) ? body.kept.filter((v) => Number.isInteger(v)) : [];
    const plies = await writeConfirmation(name, kept as number[]);
    return Response.json({ confirmed: true, reviewed_plies: plies });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
