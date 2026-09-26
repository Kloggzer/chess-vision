import { boardPng, CUT_MIME } from "@/lib/session-store/crops";
import { errorText, respond } from "@/lib/http-error";

/** The rectified playing field of one session frame — the drilldown canvas, a8 top left. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  // Nur ein Bundle OHNE `log.jsonl` faellt auf sein Handy-JPEG zurueck; ein EACCES dort ist 500.
  return respond(async () => new Response(new Uint8Array(await boardPng(name, stem, size)), {
    headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
  }), errorText);
}
