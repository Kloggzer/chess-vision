import { isJobStep } from "@/lib/backlog";
import { drainStatus, startDrain, stopDrain } from "@/lib/drain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the step panel on every page reads. */
export async function GET() {
  try {
    return Response.json(await drainStatus());
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

// The only way a job ever starts: a press. `stop` ends the running drain after its recording.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { step?: string; stop?: boolean };
    if (body.stop === true) {
      const stopped = await stopDrain();
      if ("error" in stopped) return Response.json({ error: stopped.error }, { status: 409 });
      return Response.json(await drainStatus());
    }
    const step = body.step ?? null;
    if (!isJobStep(step)) return Response.json({ error: `"${body.step}" ist kein Schritt` }, { status: 400 });
    const started = await startDrain(step);
    if ("error" in started) return Response.json({ error: started.error }, { status: 409 });
    return Response.json(await drainStatus());
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
