import { boardPng } from "@/lib/crops";

/** The rectified playing field of one session frame — the drilldown canvas, a8 top left. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  try {
    const png = await boardPng(name, stem, size);
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    return new Response(String(error), { status: 404 });
  }
}
