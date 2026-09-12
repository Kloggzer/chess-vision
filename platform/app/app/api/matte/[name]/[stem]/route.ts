import { CUT_MIME, mattePng } from "@/lib/crops";
import { clearAlpha, saveFixedAlpha } from "@/lib/matte-fix";

/** The frame's alpha as a greyscale field, aligned with `/api/board/<name>/<stem>` of the same size. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  try {
    const png = await mattePng(name, stem, size);
    return new Response(new Uint8Array(png), {
      headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    return new Response(String(error), { status: 404 });
  }
}

/** A stroke layer is one board raster of PNG — anything larger is not a mask. */
const MASK_MAX = 8 * 1024 * 1024;

/**
 * The pen's strokes, burnt into `mattes/<stem>.fixed.webp`. PIXELS ONLY: the coverage numbers
 * stay SAM's until `chesslab occluders recut <name>` has cut them, which is what the answer's
 * `recut: false` says out loud.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string; stem: string }> }) {
  const { name, stem } = await ctx.params;
  try {
    const body = (await request.json()) as { mask?: unknown; clear?: unknown };
    // `clear` ist derselbe Schreibvorgang mit leerem Alpha: der Fund war keiner.
    if (body.clear === true) return Response.json({ written: await clearAlpha(name, stem), recut: false });
    if (typeof body.mask !== "string") throw new Error("mask must be a base64 PNG");
    const mask = Buffer.from(body.mask.replace(/^data:[^,]*,/, ""), "base64");
    if (mask.length === 0 || mask.length > MASK_MAX) throw new Error(`mask is ${mask.length} bytes`);
    return Response.json({ written: await saveFixedAlpha(name, stem, mask), recut: false });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
