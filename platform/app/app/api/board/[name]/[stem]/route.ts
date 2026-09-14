import { boardPng, CUT_MIME } from "@/lib/crops";
import { storedBoardPng } from "@/lib/stored";

/** The rectified playing field of one session frame — the drilldown canvas, a8 top left. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  try {
    // A bundle without video was never exported, so the same frame lives only as a stored JPEG.
    // TODO: Gate fallback on an unexported bundle; a broad catch can substitute different pixels.
    const png = await boardPng(name, stem, size).catch(() => storedBoardPng(name, stem, size));
    return new Response(new Uint8Array(png), {
      headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    return new Response(String(error), { status: 404 });
  }
}
