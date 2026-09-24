import { boardPng, CUT_MIME } from "@/lib/session-store/crops";
import { isMissing } from "@/lib/measurement";

/** The rectified playing field of one session frame — the drilldown canvas, a8 top left. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  try {
    // Nur ein Bundle OHNE `log.jsonl` faellt auf sein Handy-JPEG zurueck; ein EACCES dort ist 500.
    const png = await boardPng(name, stem, size);
    return new Response(new Uint8Array(png), {
      headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    // "nicht da" ist 404, alles andere 500 — sonst sucht der Mensch eine Aufnahme, die es gibt und
    // deren Pixel kaputt sind.
    return new Response(String(error), { status: isMissing(error) ? 404 : 500 });
  }
}
