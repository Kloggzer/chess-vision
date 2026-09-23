/** Die Sprossen der Kette, die JOBS sind — je ein Knopf; `confirm`/`labeln` sind Seiten des
 *  Menschen. Nichts davon startet von selbst (2026-08-18, "ich will die immer selbst starten").
 *  Rein und ohne `node:`, damit Kette und Seitenleiste (Client) dieselbe Liste lesen. */
export type JobStep = "phone-record" | "label" | "export" | "settle-scan" | "matte" | "temporal" | "model-read";
export const JOB_STEPS = ["phone-record", "label", "export", "settle-scan", "matte", "temporal", "model-read"] as const satisfies readonly JobStep[];

const JOBS: ReadonlySet<string> = new Set<string>(JOB_STEPS);

export function isJobStep(step: string | null): step is JobStep {
  return step !== null && JOBS.has(step);
}

/** `"chain"` folgt der KETTE statt einer Sprosse: jede Aufnahme auf ihrer eigenen, bis zum
 *  naechsten Menschen-Tor (`confirm`, `labeln` sind Seiten und damit keine Jobs). */
export type DrainTarget = JobStep | "chain";
