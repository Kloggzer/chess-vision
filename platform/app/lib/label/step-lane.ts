/** Welche Schritt-Knoepfe die Seitenleiste zeigt. Rein und ohne `node:`-Import, damit die
 *  Client-Komponente sie einfuehren darf (`client-boundary.test.ts`). */
import { JOB_STEPS, type DrainTarget, type JobStep } from "@/lib/job-steps";

export type Lane = {
  waiting: Record<JobStep, number>;
  /** Der Schritt im Slot, falls einer laeuft — er bleibt sichtbar, bis er fertig ist.
   *  String, weil die Antwort die Job-ART fuehrt und die nicht auf `JobStep` eingeengt ist. */
  running: string | null;
};

/** Die Kette immer, ein einzelner Schritt nur mit Arbeit oder im Lauf: seit dem Ketten-Drain ist
 *  er die Ausnahme, und seine Zahl steht in der Einpflegen-Ansicht schon als Filterleiste. */
export function visibleSteps({ waiting, running }: Lane): DrainTarget[] {
  const live = JOB_STEPS.filter((step) => waiting[step] > 0 || step === running);
  return ["chain", ...live];
}
