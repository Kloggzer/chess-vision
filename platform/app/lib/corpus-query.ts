/**
 * The identity query over the WHOLE corpus — `app/api/filter/[name]`, for every live session at once.
 * Every row of `model-reads.jsonl` carries `probs`, and shipping those to the browser is tens of MB,
 * so the question is answered here and only the cell keys travel (CONCEPT.md 4.2, `Klassenwand`).
 */
import { isIdentity } from "@/lib/classes";
import { liveGames } from "@/lib/label-stream";
import { loadModelReads } from "@/lib/model-reads";
import {
  DISAGREE,
  acceptLabel,
  classesSeen,
  contradicts,
  topRead,
  type Filter,
  type ModelRead,
  type QueryAnswer,
  type QueryHit,
} from "@/lib/query";
import { loadSession, sessionId } from "@/lib/session";

/** The read that ANSWERS the query, so a card's word and what ⏎ agrees to can never diverge. */
function evidence(row: ModelRead, f: Filter): number {
  if (f.klass === DISAGREE) return topRead(row)?.p ?? 0;
  return row.probs?.[f.klass] ?? 0;
}

/** Die Phasen, die `loadSession` je auf eine Zeile schreibt — plus "keine Frage". */
const PHASES: ReadonlySet<string> = new Set(["any", "settled", "before", "after"]);

export async function queryCorpus(filter: Filter, phase = "any"): Promise<QueryAnswer> {
  // Eine unbekannte Phase filtert jede Zeile weg, und 0 Treffer waeren dann eine Behauptung statt
  // einer Antwort — dieselbe Absage wie fuer eine unbekannte Klasse darunter.
  if (!PHASES.has(phase)) throw new Error(`${phase} ist keine Phase: ${[...PHASES].join(", ")}`);
  // Refused, not answered with an empty set: `occluded` was an askable class until 2026-08-18 and
  // a bookmark still carries it. Zero hits would read as "nothing covered", which is a claim.
  if (filter.klass !== DISAGREE && !isIdentity(filter.klass))
    throw new Error(`${filter.klass} ist keine Identität — Verdeckung wird gemessen (matte.jsonl), nicht gefragt`);
  const started = Date.now();
  const classes = new Set<string>();
  const hits: QueryHit[] = [];
  let cells = 0;

  for (const name of await liveGames()) {
    const { rows } = await loadModelReads(name).catch(() => ({ rows: [] }));
    if (rows.length === 0) continue;
    for (const klass of classesSeen(rows)) classes.add(klass);
    // Only when asked for: `loadSession` parses a log the query itself has no use for.
    // Unlesbares Log bei gesetztem Filter heisst NICHT "passt": die Aufnahme faellt raus. Vorher
    // schaltete `catch(() => null)` den Filter fuer sie still ab, und die Antwort nannte die
    // Phase trotzdem.
    const session = phase === "any" ? null : await loadSession(name).catch(() => undefined);
    if (session === undefined) continue;
    const id = sessionId(name);

    const byFrame = new Map<string, QueryHit>();
    for (const row of rows) {
      if (!contradicts(row, filter)) continue;
      if (session && session.byStem.get(row.frame)?.phase !== phase) continue;
      const accept = acceptLabel(row, filter);
      if (accept === null) continue;
      let hit = byFrame.get(row.frame);
      if (!hit) {
        hit = { session: id, stem: row.frame, squares: [], reads: {}, accept: {} };
        byFrame.set(row.frame, hit);
        hits.push(hit);
      }
      hit.squares.push(row.square);
      hit.reads[row.square] = `${accept} ${evidence(row, filter).toFixed(2)}`;
      hit.accept[row.square] = accept;
      cells += 1;
    }
  }

  hits.sort((a, b) => a.session.localeCompare(b.session) || a.stem.localeCompare(b.stem));
  return { classes: [...classes].sort(), filter, phase, hits, cells, ms: Date.now() - started };
}
