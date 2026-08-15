/**
 * The Autopilot's engine start — the only server-side lifecycle hook Next offers, run ONCE per
 * server process (`docs/labeling-ux/CONCEPT.md` §5.1).
 *
 * Node runtime only (the loop spawns replays), and never during `next build`: collecting page data
 * must not queue a job on the machine the user is playing on.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startAutopilot } = await import("@/lib/autopilot-engine");
  startAutopilot();
}
