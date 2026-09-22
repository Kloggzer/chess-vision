import { stat } from "node:fs/promises";
import path from "node:path";
import { boardPng, CUT_MIME } from "@/lib/crops";
import { gameDir } from "@/lib/data";
import { storedBoardPng } from "@/lib/stored";

/** Nur ein Bundle OHNE Export darf auf sein Handy-JPEG zurueckfallen. Beide Zeugen muessen es
 *  sagen — ENOENT statt „board is missing", und keine `log.jsonl` auf der Platte. */
async function unexported(name: string, error: unknown): Promise<boolean> {
  if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") return false;
  // Ein EACCES am Log ist kein fehlender Export: sonst kaeme das Handy-JPEG unter fremdem Namen.
  return stat(path.join(gameDir(name), "log.jsonl")).then(() => false, (e: NodeJS.ErrnoException) => {
    if (e?.code !== "ENOENT") throw e;
    return true;
  });
}

/** The rectified playing field of one session frame — the drilldown canvas, a8 top left. */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ name: string; stem: string }> },
) {
  const { name, stem } = await ctx.params;
  const raw = Number(new URL(request.url).searchParams.get("size"));
  const size = Number.isFinite(raw) && raw >= 128 && raw <= 1024 ? Math.round(raw) : 720;
  try {
    // Ein kaputter Export ist kein Fallback: fremde Pixel unter der Identitaet des exportierten
    // Frames wuerden dem Menschen ein Urteil ueber das falsche Bild abverlangen.
    const png = await boardPng(name, stem, size).catch(async (error) => {
      if (!(await unexported(name, error))) throw error;
      return storedBoardPng(name, stem, size);
    });
    return new Response(new Uint8Array(png), {
      headers: { "content-type": CUT_MIME, "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    // Wie `api/cell` und `api/frame`: "nicht da" ist 404, alles andere unser Fehler. Pauschal 404
    // machte aus einem unlesbaren Brett dieselbe Antwort wie aus einem fehlenden — und der Mensch
    // sucht dann eine Aufnahme, die es gibt und deren Pixel kaputt sind.
    const missing = (error as { code?: string })?.code === "ENOENT";
    return new Response(String(error), { status: missing ? 404 : 500 });
  }
}
