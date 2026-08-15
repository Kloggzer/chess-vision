import { autopilotStatus, clearErrors, tick } from "@/lib/autopilot-engine";
import { setPaused } from "@/lib/autopilot-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What the strip on every page reads. */
export async function GET() {
  try {
    return Response.json(await autopilotStatus());
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}

// Persisted pause; un-pause ticks immediately (press = work request).
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { paused?: boolean };
    if (typeof body.paused !== "boolean") return Response.json({ error: "paused must be a boolean" }, { status: 400 });
    await setPaused(body.paused);
    // The press is the human answering the strip; leaving the old complaint up makes the next tick
    // look like it failed again.
    clearErrors();
    if (!body.paused) void tick();
    return Response.json(await autopilotStatus());
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 400 });
  }
}
