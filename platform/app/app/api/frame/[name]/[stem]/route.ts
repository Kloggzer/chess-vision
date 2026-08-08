import { framePng } from "@/lib/data";

/** Frames are streamed out of `data/` — never copied into the app. */
export async function GET(_request: Request, ctx: RouteContext<"/api/frame/[name]/[stem]">) {
  const { name, stem } = await ctx.params;
  try {
    const png = await framePng(name, stem);
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
    });
  } catch {
    return new Response("no such frame", { status: 404 });
  }
}
