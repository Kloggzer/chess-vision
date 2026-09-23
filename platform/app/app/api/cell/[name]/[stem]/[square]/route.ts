import { cellPng, CUT_MIME, medianPng } from "@/lib/session-store/crops";
import { isMissing } from "@/lib/measurement";
import { loadSession } from "@/lib/session-store/session";
import { storedCellPng } from "@/lib/session-store/stored";

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
    const cut = median ? medianPng : cellPng;
    const px = size(request, 160);
    // Only a bundle that was never exported falls through to its stored JPEGs (the same
    // "no session log" reading `lib/label/label-stream.ts` uses); an exported session's errors surface.
    const exported = await loadSession(name).then(
      () => true,
      (e: unknown) => {
        // NUR "kein Log da" faellt auf die gespeicherten JPEGs zurueck. Ein kaputtes log.jsonl
        // servierte sonst Pixel aus einer anderen Geometrie, ohne sich zu zeigen.
        if (isMissing(e)) return false;
        throw e;
      },
    );
    const png = exported ? await cut(name, stem, square, px) : await storedCellPng(name, stem, square, px);
    return new Response(new Uint8Array(png), {
      headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    // "Nicht da" ist 404, alles andere 500: eine korrupte `log.jsonl` oder ein `sharp`-Fehler ist
    // kein fehlender Frame.
    return Response.json({ error: String(error) }, { status: isMissing(error) ? 404 : 500 });
  }
}
