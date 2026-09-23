/** Next ruft `register` einmal beim Serverstart. Der Python-Worker startet hier und rechnet Kette und
 *  Strom-Zulassung vor, damit die erste Seite nicht auf Python-Start und 190 MB JSON wartet
 *  (`docs/web-ruft-python.md`, Latenz). Nur im Node-Runtime; der Server wartet NICHT darauf. */
export function register(): void {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  void warmPython().catch((e: unknown) => console.error("[instrumentation] Python-Worker vorwaermen fehlgeschlagen:", e));
}

/** Scheitert ein Teil, laeuft der Server weiter und die erste Seite zahlt den Kaltstart. Die Seite
 *  startet keinen zweiten Worker: sie reiht sich beim laufenden ein (`lib/py/worker.ts`). */
export async function warmPython(): Promise<void> {
  const { listGames } = await import("@/lib/session-store/recordings");
  const { chainStates } = await import("@/lib/chain/chain");
  const { liveGames, warmAdmission } = await import("@/lib/label/label-stream");
  const parts = await Promise.allSettled([
    listGames().then(chainStates),
    liveGames().then(warmAdmission),
  ]);
  for (const part of parts) {
    if (part.status === "rejected") console.error("[instrumentation] Python-Worker vorwaermen fehlgeschlagen:", part.reason);
  }
}
