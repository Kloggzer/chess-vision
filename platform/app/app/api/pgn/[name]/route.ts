import { respond } from "@/lib/http-error";
import { saveReference } from "@/lib/session-store/reference";

/** Upload `reference.pgn`; ersetzt nur mit `?replace=1`. Die Schutzregeln stehen in `saveReference`. */
export async function POST(request: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const replace = new URL(request.url).searchParams.get("replace") === "1";
  return respond(async () => saveReference(name, await request.text(), replace));
}
