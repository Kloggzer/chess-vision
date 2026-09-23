import { authorized, declare, validateManifest } from "@/lib/ingest/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Declare a session. The answer is what this machine ALREADY holds per file, so the phone uploads
 * the difference — a session copied over USB, or half-transferred before the Wi-Fi dropped, costs
 * only what is missing.
 */
export async function POST(request: Request) {
  if (!(await authorized(request))) return Response.json({ error: "unpaired" }, { status: 401 });
  try {
    return Response.json(await declare(validateManifest(await request.json())));
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
