import { CHUNK_BYTES, authorized } from "@/lib/ingest/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Anything that is not this app has to be ruled out by the ANSWER, not a timeout — hence the
 *  explicit marker. `paired` lets the phone tell "wrong host" from "wrong token". */
export async function GET(request: Request) {
  // Der Token darf scheitern, das ERKENNUNGSZEICHEN nicht: sonst bekommt das Handy Next' HTML-500
  // und kann diesen Rechner von den anderen nicht unterscheiden.
  const paired = await authorized(request).then(
    (ok) => ({ paired: ok }),
    (error: unknown) => ({ paired: false, error: String(error) }),
  );
  return Response.json({ app: "chesslab-platform", ingest: 1, chunk: CHUNK_BYTES, ...paired });
}
