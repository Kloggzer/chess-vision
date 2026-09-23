/** The review queues are `chainState` asked across every game and sorted, not a new truth: a game
 *  sits in exactly the queue of its step. Only `queueRows` touches the disk. */
import type { ChainState, ChainStep } from "@/lib/chain/chain";
import { adoptOffered, chainState } from "@/lib/chain/chain";
import { countFrames, listGames, loadCandidate, recordedAt } from "@/lib/session-store/recordings";
import { isArchived, loadMeta } from "@/lib/session-store/meta";

export type QueueRow = {
  name: string;
  title: string | null;
  /** Plies the tracker committed — 0 while no `candidate.json` exists. */
  plies: number;
  /** Review PNGs on disk — counted only for bare bundles, where it is all that is left to judge. */
  frames: number;
  archived: boolean;
  /** When `confirmed` was stamped, for the export hold of §4.1.1 — absent on rows built elsewhere. */
  confirmedAt?: string | null;
  /** The whole disk state, so a row can render the same controls a card does without re-reading. */
  chain: ChainState;
};

export type Queues = {
  /** Waiting for the human confirm screen. */
  confirm: QueueRow[];
  /** Waiting for the human at the labelling stream. */
  labeln: QueueRow[];
  /** Has a recording but no candidate — the MACHINE step nobody started yet, hence unreviewable. */
  blocked: QueueRow[];
  /** Neither video nor candidate: nothing any step can act on (see `isBare`). */
  bare: QueueRow[];
};

/** A bundle with no recording and no candidate. Still DATA (frames, maybe a PGN), so collapsed and
 *  countable, never hidden or removed. */
export function isBare(row: Pick<QueueRow, "chain">): boolean {
  return row.chain.video === null && proposesCandidate(row.chain.step);
}

/** The two steps that write `candidate.json`: a bundle with a phone record waits like a replay one. */
export const proposesCandidate = (step: ChainStep | null): boolean => step === "label" || step === "phone-record";

/** Newest first, ties broken by the name so the order never depends on the readdir. */
export const newestFirst = (rows: QueueRow[]) =>
  [...rows].sort((a, b) => recordedAt(b.name).localeCompare(recordedAt(a.name)) || b.name.localeCompare(a.name));

/** Useless and archived games are out of every queue and out of the bare count. */
export function splitQueues(rows: QueueRow[]): Queues {
  const live = newestFirst(rows.filter((r) => !r.chain.useless && !r.archived));
  return {
    confirm: live.filter((r) => r.chain.step === "confirm"),
    labeln: live.filter((r) => r.chain.step === "labeln"),
    blocked: live.filter((r) => proposesCandidate(r.chain.step) && r.chain.video !== null),
    bare: live.filter(isBare),
  };
}

/** Only for a bare bundle — there the frame count is the whole answer to "is this worth keeping". */
export async function bareFrames(name: string, chain: ChainState): Promise<number> {
  if (chain.video !== null || chain.hasCandidate) return 0;
  return countFrames(name);
}

/**
 * Bundles whose phone `.pgn` may become `reference.pgn`. Archived and useless ones are nobody's
 * work right now, exactly as the queues treat them everywhere else.
 */
export function offeredPgns(rows: readonly QueueRow[]): string[] {
  return rows.filter((r) => !r.archived && !r.chain.useless && r.chain.offeredPgn).map((r) => r.name);
}

/** Every game as a queue row. One candidate read per game, same as the home page does. */
export async function queueRows(): Promise<QueueRow[]> {
  const names = await listGames();
  const rows = await Promise.all(
    names.map(async (name) => {
      const [chain, meta, archived, candidate] = await Promise.all([
        chainState(name),
        loadMeta(name),
        isArchived(name),
        loadCandidate(name).catch(() => null),
      ]);
      return {
        name,
        title: meta.title ?? null,
        plies: candidate?.moves.length ?? 0,
        frames: await bareFrames(name, chain),
        archived,
        confirmedAt: candidate?.confirmed_at ?? null,
        chain,
      };
    }),
  );
  // The phone writes that PGN so it can be used, and `adoptPgn` never overwrites — so the read of
  // the queue is where it lands now that nothing ticks. One row per bundle, once.
  await adoptOffered(offeredPgns(rows));
  return rows;
}
