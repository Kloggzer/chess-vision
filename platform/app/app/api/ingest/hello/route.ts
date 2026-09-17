import { CHUNK_BYTES, authorized } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The handshake the phone probes the subnet with — it must answer fast and say nothing secret.
 *
 * A scanner hits up to 254 addresses; anything that is not this app has to be ruled out by the
 * ANSWER, not by a timeout, which is why the marker is explicit. `paired` reports whether the
 * caller's token is the one this machine holds, so the phone can tell "wrong host" from "wrong
 * token" — the two failures a user fixes in completely different places.
 */
export async function GET(request: Request) {
  // Der Token kann fehlschlagen (unlesbares Inbox-Verzeichnis, `CHESSLAB_DATA_DIR` ungesetzt), das
  // ERKENNUNGSZEICHEN darf es nicht: ohne Fang bekam genau das Handy, das eine Kopfzeile schickt,
  // Next' HTML-500 und konnte diesen Rechner von den 253 anderen nicht unterscheiden.
  const paired = await authorized(request).then(
    (ok) => ({ paired: ok }),
    (error: unknown) => ({ paired: false, error: String(error) }),
  );
  return Response.json({ app: "chesslab-platform", ingest: 1, chunk: CHUNK_BYTES, ...paired });
}
