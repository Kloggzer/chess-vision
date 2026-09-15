import { loadVerifyStream } from "@/lib/verify";

/** Nachschub fuer die Matte-Lane: `skip` sind die offenen Frames, die der Client schon haelt. */
export async function GET(request: Request) {
  const skip = Number(new URL(request.url).searchParams.get("skip") ?? 0);
  try {
    return Response.json(await loadVerifyStream(Number.isFinite(skip) && skip > 0 ? Math.floor(skip) : 0));
  } catch (error) {
    // Dieselbe Regel wie `api/cell/…`: "nicht da" ist 404, alles andere ist unser Fehler — und
    // der Grund gehoert in den Rumpf, sonst liest der Nutzer eine nackte 500.
    const missing = (error as { code?: string })?.code === "ENOENT";
    return Response.json({ error: String(error) }, { status: missing ? 404 : 500 });
  }
}
