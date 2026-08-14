import { writeConfirmation } from "@/lib/data";

/** The human's verdict: which unmatched candidate plies survive. The plies list is recomputed
 *  server-side from the file — the client only ever names the indices it kept. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  try {
    const body = (await request.json()) as { kept?: unknown; drop?: unknown };
    const kept = Array.isArray(body.kept) ? body.kept.filter((v) => Number.isInteger(v)) : [];
    // `drop` names PLY NUMBERS a human strikes from the reviewed set — the matched ones the LCS
    // vouched for on SAN alone. `kept` still names indices into the candidate's own move list.
    const drop = Array.isArray(body.drop) ? body.drop.filter((v) => Number.isInteger(v)) : [];
    const plies = await writeConfirmation(name, kept as number[], drop as number[]);
    return Response.json({ confirmed: true, reviewed_plies: plies });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
