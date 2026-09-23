import { checkName, framePng, reviewFramePath } from "@/lib/data";
import { isMissing } from "@/lib/measurement";

/** Frames are streamed out of `data/` — never copied into the app. */
export async function GET(_request: Request, ctx: RouteContext<"/api/frame/[name]/[stem]">) {
  const { name, stem } = await ctx.params;
  try {
    checkName(name, "game name");
    checkName(stem, "frame");
  } catch (error) {
    return new Response(String(error), { status: 400 });
  }
  try {
    const bytes = await framePng(name, stem);
    // The bytes are served AS STORED — a run writes WebP, older ones left PNG behind, and
    // transcoding a 1.3 MB review board per request would buy nothing a re-run does not.
    const webp = (await reviewFramePath(name, stem))?.endsWith(".webp") ?? false;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-type": webp ? "image/webp" : "image/png",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    // Wie `api/cell`: "nicht da" ist 404, alles andere unser Fehler. Pauschal 404 machte aus einem
    // unlesbaren File dieselbe Antwort wie aus einem fehlenden, und das `<img>` zeigt beide gleich.
    const missing = isMissing(error);
    return new Response(missing ? "no such frame" : String(error), { status: missing ? 404 : 500 });
  }
}
