import { cellPng, medianPng } from "@/lib/crops";

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
    const png = await cut(name, stem, square, size(request, 160));
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    return new Response(String(error), { status: 404 });
  }
}
