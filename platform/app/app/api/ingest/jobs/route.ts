import { pending, transfers } from "@/lib/ingest/ingest";
import { jobs } from "@/lib/chain/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the transfers page polls: what arrived, what is still in flight, what the packs did. */
export async function GET() {
  try {
    const [rows, inFlight, queue] = await Promise.all([transfers(), pending(), jobs()]);
    return Response.json({ transfers: rows, pending: inFlight, jobs: queue });
  } catch (error) {
    // `jobs()` wirft auf einer unlesbaren `jobs.jsonl`; ohne Fang bekam die Seite eine nackte 500
    // ohne Grund und zeigte gar nichts.
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
