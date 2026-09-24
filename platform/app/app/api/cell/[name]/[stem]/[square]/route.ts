import { cellPng, CUT_MIME } from "@/lib/session-store/crops";
import { isMissing } from "@/lib/measurement";

/** Bounds the work a URL can ask for — a crop is a thumbnail, not a poster. */
function size(request: Request, fallback: number): number {
  const raw = Number(new URL(request.url).searchParams.get("size"));
  return Number.isFinite(raw) && raw >= 32 && raw <= 512 ? Math.round(raw) : fallback;
}

/** One square out of the RAW session frame; `?median=1` gives its clean interval median. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string; square: string }> },
) {
  const { name, stem, square } = await ctx.params;
  const median = new URL(request.url).searchParams.get("median") === "1";
  try {
    // Only a bundle that was never exported falls through to its stored JPEGs (`web_cuts.py`).
    const png = await cellPng(name, stem, square, size(request, 160), median);
    return new Response(new Uint8Array(png), {
      headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    // "Nicht da" ist 404, alles andere 500: eine korrupte `log.jsonl` oder ein unlesbares Brett ist
    // kein fehlender Frame.
    return Response.json({ error: String(error) }, { status: isMissing(error) ? 404 : 500 });
  }
}
