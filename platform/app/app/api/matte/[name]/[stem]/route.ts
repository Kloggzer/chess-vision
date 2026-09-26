import { CUT_MIME, mattePng } from "@/lib/session-store/crops";
import { clearAlpha, restoreAlpha, saveFixedAlpha } from "@/lib/chain/matte-edit";
import { BadRequest, errorText, jsonBody, respond } from "@/lib/http-error";

/** The frame's alpha as a greyscale field, aligned with `/api/board/<name>/<stem>` of the same size. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  return respond(async () => new Response(new Uint8Array(await mattePng(name, stem, size)), {
    // Der Stift schreibt unter derselben URL neu: grid.tsx und cell-lane.tsx haengen kein `?v=` an.
    headers: { "content-type": CUT_MIME, "cache-control": "no-cache" },
  }), errorText);
}

/** A stroke layer is one board raster of PNG — anything larger is not a mask. */
const MASK_MAX = 8 * 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * The pen's strokes, burnt into `mattes/<stem>.fixed.webp`. PIXELS ONLY: the coverage numbers
 * stay SAM's until `chesslab occluders recut <name>` has cut them, which is what the answer's
 * `recut: false` says out loud.
 */
export async function POST(request: Request, ctx: { params: Promise<{ name: string; stem: string }> }) {
  const { name, stem } = await ctx.params;
  return respond(async () => {
    const body = await jsonBody<{ mask?: unknown; clear?: unknown; restore?: unknown }>(request);
    // `clear` ist derselbe Schreibvorgang mit leerem Alpha: der Fund war keiner. `restore`
    // nimmt ihn zurueck — die Handfassung faellt weg, SAMs Schnitt darunter gilt wieder.
    if (body.restore === true) return { written: await restoreAlpha(name, stem), recut: false };
    if (body.clear === true) return { written: await clearAlpha(name, stem), recut: false };
    if (typeof body.mask !== "string") throw new BadRequest("mask must be a base64 PNG");
    const mask = Buffer.from(body.mask.replace(/^data:[^,]*,/, ""), "base64");
    if (mask.length === 0 || mask.length > MASK_MAX) throw new BadRequest(`mask is ${mask.length} bytes`);
    if (!mask.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) throw new BadRequest("mask is not a PNG");
    // Nur eine kaputte Maske ist 400: unter 400 schickte die Lane den Menschen zum Nachmalen,
    // waehrend in Wahrheit nichts auf die Platte kam.
    return { written: await saveFixedAlpha(name, stem, mask), recut: false };
  });
}
