import { loadProposals } from "@/lib/proposals";
import { classesSeen, framesMatching, type Filter } from "@/lib/proposals";

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
  try {
    const { rows } = await loadProposals(name);
    const frames = framesMatching(rows, filter).map((f) => ({
      stem: f.stem,
      squares: f.cells.map((c) => c.square),
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
