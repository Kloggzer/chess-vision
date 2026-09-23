import { CUT_MIME, mattePng } from "@/lib/session-store/crops";
import { clearAlpha, restoreAlpha, saveFixedAlpha } from "@/lib/chain/matte-edit";
import { isMissing } from "@/lib/measurement";

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
    // Wie `api/frame`: "nicht da" ist 404, alles andere unser Fehler. Pauschal 404 machte aus einem
    // unlesbaren Alpha dieselbe Antwort wie aus einem fehlenden, und die Lane zeigt beides als
    // "keine Matte" — der Mensch sucht dann eine Messung, die es gibt und die kaputt ist.
    return new Response(String(error), { status: isMissing(error) ? 404 : 500 });
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
  let write: () => Promise<string>;
  try {
    const body = (await request.json()) as { mask?: unknown; clear?: unknown; restore?: unknown };
    // `clear` ist derselbe Schreibvorgang mit leerem Alpha: der Fund war keiner. `restore`
    // nimmt ihn zurueck — die Handfassung faellt weg, SAMs Schnitt darunter gilt wieder.
    if (body.restore === true) write = () => restoreAlpha(name, stem);
    else if (body.clear === true) write = () => clearAlpha(name, stem);
    else {
      if (typeof body.mask !== "string") throw new Error("mask must be a base64 PNG");
      const mask = Buffer.from(body.mask.replace(/^data:[^,]*,/, ""), "base64");
      if (mask.length === 0 || mask.length > MASK_MAX) throw new Error(`mask is ${mask.length} bytes`);
      write = () => saveFixedAlpha(name, stem, mask);
    }
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
  try {
    return Response.json({ written: await write(), recut: false });
  } catch (error) {
    // Ein gescheiterter Schreibvorgang ist nicht die Schuld der Maske: unter 400 schickte die Lane
    // den Menschen zum Nachmalen, waehrend in Wahrheit nichts auf die Platte kam.
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
