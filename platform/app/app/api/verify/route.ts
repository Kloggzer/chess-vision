import { respond } from "@/lib/http-error";
import { loadVerifyStream } from "@/lib/label/verify";

/** Nachschub fuer die Matte-Lane: `skip` sind die offenen Frames, die der Client schon haelt. */
export async function GET(request: Request) {
  const skip = Number(new URL(request.url).searchParams.get("skip") ?? 0);
  return respond(() => loadVerifyStream(Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0));
}
