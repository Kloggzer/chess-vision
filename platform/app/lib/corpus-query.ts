/**
 * The identity query over the WHOLE corpus — `app/api/filter/[name]`, for every live session at once.
 * All 308 705 proposal rows carry `probs`; shipping those to the browser is 58 MB, so the question is
 * answered here and only the cell keys it selects travel (CONCEPT.md 4.2, lane `Klassenwand`).
 */
import { liveGames } from "@/lib/label-stream";
import { loadProposals } from "@/lib/proposals";
import {
  DISAGREE,
  acceptLabel,
  classesSeen,
  contradicts,
  topRead,
  type Filter,
  type Proposal,
  type QueryAnswer,
  type QueryHit,
} from "@/lib/query";
import { loadSession, sessionId } from "@/lib/session";

/** The read that ANSWERS the query, so a card's word and what ⏎ agrees to can never diverge. */
function evidence(row: Proposal, f: Filter): number {
  if (f.klass === DISAGREE) return topRead(row)?.p ?? 0;
  if (f.klass === "occluded") return Math.max(row.score, row.probs?.occluded ?? 0);
  return row.probs?.[f.klass] ?? 0;
}

export async function queryCorpus(filter: Filter, phase = "any"): Promise<QueryAnswer> {
  const started = Date.now();
  const classes = new Set<string>();
  const hits: QueryHit[] = [];
  let cells = 0;

  for (const name of await liveGames()) {
    const { rows } = await loadProposals(name).catch(() => ({ rows: [] }));
    if (rows.length === 0) continue;
    for (const klass of classesSeen(rows)) classes.add(klass);
    // Only when asked for: `loadSession` parses a log the query itself has no use for.
    const session = phase === "any" ? null : await loadSession(name).catch(() => null);
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
