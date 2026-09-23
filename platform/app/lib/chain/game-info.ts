import { chainState, type ChainState } from "@/lib/chain/chain";
import { bareFrames } from "@/lib/chain/queues";
import type { Job } from "@/lib/chain/slot";
import { judgedKeys } from "@/lib/session-store/corrections";
import { isArchived, loadMeta } from "@/lib/session-store/meta";
import { boardProgressOf, modelReadRows, readKey, type ReadCensus } from "@/lib/session-store/model-reads";
import { loadCandidate, truthSans } from "@/lib/session-store/recordings";
import { sessionId } from "@/lib/session-store/session";

export type GameInfo = {
  name: string;
  /** Handed down, not derived: the card is a client component and `lib/session-store/session`
   *  reaches the disk through `sharp` — `client-boundary.test.ts` guards exactly that import. */
  sessionId: string;
  title: string | null;
  archived: boolean;
  /** Review PNGs on disk — only counted for bundles with neither video nor candidate. */
  frames: number;
  createdAt: string | null;
  confirmed: boolean;
  confirmedAt: string | null;
  plies: number;
  reviewed: number;
  /** Mainline length of `reference.pgn`, or null — no reference on disk. */
  pgnPlies: number | null;
  /** Boards a model has read and how many carry a human verdict (CONCEPT.md 6.2). */
  boards: number;
  boardsDone: number;
  cells: number;
  cellsDone: number;
  /** `false` = no `model-reads.jsonl`, so the bar prints `—` instead of claiming zero of zero. */
  modelRead: boolean;
  /** Where this game sits on the label → confirm → export → model-read → labeln ladder. */
  chain: ChainState;
  /** The last job this game ran, so a reload still shows what failed and what answers it. */
  lastJob: Job | null;
};

/** Eine Aufnahme als Karte, fuer `/` und `/game/<name>` gleich gelesen — vorher zwei Kopien, und
 *  nur eine sah den Archiv-Stempel der Pipeline. BRETTER zuerst, Zellen danach (CONCEPT.md 6.2). */
export async function gameInfo(name: string, lastJob: Job | null): Promise<{ info: GameInfo; census: ReadCensus }> {
  const [meta, archived, candidate, chain, pgn] = await Promise.all([
    loadMeta(name),
    isArchived(name),
    loadCandidate(name).catch(() => null),
    chainState(name),
    truthSans(name),
  ]);
  const decided = await judgedKeys(name);
  const { census, boards, done } = await boardProgressOf(name, decided.keys());
  const rows = await modelReadRows(name);
  const info: GameInfo = {
    name,
    sessionId: sessionId(name),
    title: meta.title ?? null,
    archived,
    frames: await bareFrames(name, chain),
    createdAt: candidate?.created_at ?? null,
    confirmed: candidate?.confirmed ?? false,
    confirmedAt: candidate?.confirmed_at ?? null,
    plies: candidate?.moves.length ?? 0,
    reviewed: candidate?.reviewed_plies?.length ?? 0,
    pgnPlies: pgn ? pgn.length : null,
    boards,
    boardsDone: done,
    cells: census.cells,
    cellsDone: rows.filter((r) => decided.has(readKey(r))).length,
    modelRead: census.present,
    chain,
    lastJob,
  };
  return { info, census };
}
