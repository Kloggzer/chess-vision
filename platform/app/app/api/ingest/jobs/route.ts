import { pending, transfers } from "@/lib/ingest";
import { jobs } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the transfers page polls: what arrived, what is still in flight, what the packs did. */
export async function GET() {
  const [rows, inFlight, queue] = await Promise.all([transfers(), pending(), jobs()]);
  return Response.json({ transfers: rows, pending: inFlight, jobs: queue });
}
