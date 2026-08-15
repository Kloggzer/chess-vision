// Once per server process, Node only, never during build (no job on dev machine).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { startAutopilot } = await import("@/lib/autopilot-engine");
  startAutopilot();
}
