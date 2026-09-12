import { loadVerifyStream } from "@/lib/verify";

/** Nachschub fuer die Matte-Lane: `skip` sind die offenen Frames, die der Client schon haelt. */
export async function GET(request: Request) {
  const skip = Number(new URL(request.url).searchParams.get("skip") ?? 0);
  return Response.json(await loadVerifyStream(Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0));
}
