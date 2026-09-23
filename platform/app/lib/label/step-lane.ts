/** Welche Schritt-Knoepfe die Seitenleiste zeigt. Rein und ohne `node:`-Import, damit die
 *  Client-Komponente sie einfuehren darf (`client-boundary.test.ts`). */
import type { JobStep } from "@/lib/chain/backlog";
import type { DrainTarget } from "@/lib/chain/drain";

/** Kettenreihenfolge. Hier dupliziert statt aus `backlog` geholt: das Modul fasst die Platte an. */
const CHAIN_ORDER: readonly JobStep[] = [
  "phone-record", "label", "export", "settle-scan", "matte", "temporal", "model-read",
];

export type Lane = {
  waiting: Record<JobStep, number>;
  /** Der Schritt im Slot, falls einer laeuft — er bleibt sichtbar, bis er fertig ist.
   *  String, weil die Antwort die Job-ART fuehrt und die nicht auf `JobStep` eingeengt ist. */
  running: string | null;
};

/** Die Kette immer, ein einzelner Schritt nur mit Arbeit oder im Lauf: seit dem Ketten-Drain ist
 *  er die Ausnahme, und seine Zahl steht in der Einpflegen-Ansicht schon als Filterleiste. */
export function visibleSteps({ waiting, running }: Lane): DrainTarget[] {
  const live = CHAIN_ORDER.filter((step) => waiting[step] > 0 || step === running);
  return ["chain", ...live];
}
