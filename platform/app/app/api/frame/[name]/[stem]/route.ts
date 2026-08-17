import { framePng, reviewFramePath } from "@/lib/data";

/** Frames are streamed out of `data/` — never copied into the app. */
export async function GET(_request: Request, ctx: RouteContext<"/api/frame/[name]/[stem]">) {
  const { name, stem } = await ctx.params;
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
  } catch {
    return new Response("no such frame", { status: 404 });
  }
}
