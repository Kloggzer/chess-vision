import { loadProposals } from "@/lib/proposals";
import { classesSeen, framesMatching, topRead, type Filter } from "@/lib/proposals";
import { loadSession } from "@/lib/session";

/**
 * The BOARDS a filter hits — computed here, not in the browser: a session is ~48 000 proposal
 * rows and shipping them to the client to filter would be 6 MB per keystroke. The answer is a
 * few hundred bytes.
 */
export async function GET(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const url = new URL(request.url);
  const filter: Filter = {
    klass: url.searchParams.get("class") ?? "occluded",
    min: Number(url.searchParams.get("min") ?? "0.1"),
  };
  // `phase=after|before` narrows to one side of the interval. The two need different scepticism
  // and a labeler works one kind at a time, so it is a filter and not merely a badge.
  const phase = url.searchParams.get("phase");
  try {
    const { rows } = await loadProposals(name);
    const session = await loadSession(name);
    const frames = framesMatching(rows, filter)
      .filter((f) => !phase || phase === "any" || session.byStem.get(f.stem)?.phase === phase)
      .map((f) => ({
        stem: f.stem,
        squares: f.cells.map((c) => c.square),
        // What the model actually reads there, so the board can SAY it instead of only tinting.
        reads: Object.fromEntries(
          f.cells.map((c) => {
            const t = topRead(c);
            return [c.square, t ? `${t.label} ${t.p.toFixed(2)}` : ""];
          }),
        ),
      }));
    return Response.json({
      classes: classesSeen(rows),
      frames,
      cells: frames.reduce((n, f) => n + f.squares.length, 0),
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
