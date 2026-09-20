/**
 * Die Label-Historie lesen: jede geschriebene Zeile beider Ledger, jüngste zuerst, mit dem Wert,
 * den sie abgelöst hat (CONCEPT.md 4.2.4). Aus den Ledgern und nicht aus dem Strom — ein Urteil
 * verschwindet aus jeder Lane, sobald es geschrieben ist, und genau da fängt die Historie an.
 */
import { ledgerChanges, type Ledger, type LedgerChange } from "@/lib/corrections";
import { fenLabels } from "@/lib/fen";
import type { Change } from "@/lib/history";
import { liveGames } from "@/lib/label-stream";
import { loadSession } from "@/lib/session";

/** Kopfraum je Aufnahme: genug, damit keine die anderen verdraengt, und weit unter
 *  "alles lesen". Geschnitten wird danach ueber den ganzen Korpus. */
const GAMES_HEADROOM = 4;

const LEDGERS: readonly Ledger[] = ["corrections", "reviewed"];

/** Jüngste zuerst; bei gleichem Zeitstempel entscheidet die Zeilennummer, denn ein Stapel-Schreiben
 *  trägt für alle Zeilen dieselbe Sekunde. */
function newestFirst(a: LedgerChange, b: LedgerChange): number {
  return b.ts.localeCompare(a.ts) || b.seq - a.seq;
}

export async function loadHistory(limit: number): Promise<Change[]> {
  const out: Change[] = [];
  for (const name of await liveGames()) {
    const rows = (await Promise.all(LEDGERS.map((l) => ledgerChanges(name, l)))).flat();
    if (rows.length === 0) continue;
    // Erst hier: die Session zu laden kostet, und die meisten Aufnahmen tragen gar kein Ledger.
    const fens = new Map((await loadSession(name)).rows.map((r) => [r.stem, r.fen]));
    // Erst filtern, dann schneiden: ein Re-Export schreibt Bretter neu, Labels sind global
    // gekeyt und ueberleben das — geschnitten wurde sonst auf Zeilen, die danach wegfielen.
    const start = out.length;
    for (const row of rows.sort(newestFirst)) {
      // Der Deckel gilt JE AUFNAHME: `liveGames` ordnet nach Aufnahmedatum, nicht danach, wann
      // jemand gelabelt hat — global gezaehlt fuellte ihn die erste Aufnahme, und eine gestern
      // gelabelte aeltere kam nie vor. Geschnitten wird am Ende ueber den ganzen Korpus.
      if (out.length - start >= limit * GAMES_HEADROOM) break;
      const fen = fens.get(row.frame);
      if (fen === undefined) continue;
      out.push({
        name,
        sessionId: row.session_id,
        frame: row.frame,
        square: row.square,
        label: row.label,
        before: row.before,
        fen_label: fenLabels(fen)[row.square] ?? "empty",
        ledger: row.ledger,
        retract: row.retract,
        ts: row.ts,
      });
    }
  }
  return out.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, limit);
}
