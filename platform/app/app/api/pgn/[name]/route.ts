import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Chess } from "chess.js";
import { gameDir } from "@/lib/data";

/**
 * Upload `reference.pgn` — the truth the confirm view compares against.
 *
 * Validated BEFORE it lands: a PGN chess.js cannot replay would poison every later confirm.
 * An existing reference is not overwritten unless `?replace=1` — it may already have vouched
 * for reviewed plies, and replacing it silently would orphan that record (the UI says so and
 * asks again).
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const replace = new URL(request.url).searchParams.get("replace") === "1";
  try {
    const text = await request.text();
    const chess = new Chess();
    chess.loadPgn(text);
    const plies = chess.history().length;
    if (plies === 0) throw new Error("the PGN holds no moves");
    const file = path.join(gameDir(name), "reference.pgn");
    const exists = await readFile(file, "utf8").then(() => true, () => false);
    if (exists && !replace) {
      return Response.json({ error: "reference.pgn exists — replace must be explicit" }, { status: 409 });
    }
    await writeFile(file, text.endsWith("\n") ? text : text + "\n", "utf8");
    return Response.json({ plies, replaced: exists });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
