import { PageTitle } from "@/app/page-title";
import { loadHistory } from "@/lib/label/history-load";
import { HistoryView } from "./history-view";

export const dynamic = "force-dynamic";

/** So weit reicht der Rückweg — ein paar Sitzungen, nicht das ganze Ledger. */
const DEPTH = 2000;

/** Was zuletzt gelabelt wurde, jüngste Änderung zuerst, und der Weg zurück durch die älteren. */
export default async function HistoriePage() {
  const changes = await loadHistory(DEPTH);
  return (
    <main className="space-y-3">
      <PageTitle title="Historie" />
      <HistoryView changes={changes} />
    </main>
  );
}
