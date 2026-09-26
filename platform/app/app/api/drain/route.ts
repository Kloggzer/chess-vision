import { Conflict, respond } from "@/lib/http-error";
import { isJobStep } from "@/lib/job-steps";
import { drainStatus, startDrain, stopDrain } from "@/lib/chain/drain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the step panel on every page reads. */
export async function GET() {
  return respond(() => drainStatus());
}

// The only way a job ever starts: a press. `stop` ends the running drain after its recording.
export async function POST(request: Request) {
  return respond(async () => {
    const body = (await request.json().catch(() => ({}))) as { step?: string; stop?: boolean };
    if (body.stop === true) {
      const stopped = await stopDrain();
      if ("error" in stopped) throw new Conflict(stopped.error);
      return await drainStatus();
    }
    const step = body.step ?? null;
    // `chain` folgt der Kette statt einer Sprosse und haelt an jedem Menschen-Tor.
    if (step !== "chain" && !isJobStep(step)) {
      return Response.json({ error: `"${body.step}" ist kein Schritt` }, { status: 400 });
    }
    const started = await startDrain(step);
    if ("error" in started) throw new Conflict(started.error);
    return await drainStatus();
  });
}
