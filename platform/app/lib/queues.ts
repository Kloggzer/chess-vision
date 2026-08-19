/**
 * The two review queues, derived from the same disk state the cards read.
 *
 * A queue is not a new truth: it is `chainState` asked across every game and sorted, so a game
 * appears in exactly the queue whose step it is on and disappears the moment the step is done.
 * The split is pure so it can be tested without a data dir; only `queueRows` touches the disk.
 */
import type { ChainState } from "@/lib/chain";
import { adoptOffered, chainState } from "@/lib/chain";
import { listFrameStems, listGames, loadCandidate } from "@/lib/data";
import { loadMeta } from "@/lib/meta";

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

/**
 * A bundle with no recording and no candidate — every control on its card is a dead end.
 *
 * Eighteen of them arrived from older transfers and filled `/` with identical rows saying
 * "nothing to label". They are still DATA (frames, maybe a PGN), so they are collapsed and
 * countable, never hidden and never removed.
 */
export function isBare(row: Pick<QueueRow, "chain">): boolean {
  return row.chain.video === null && row.chain.step === "label";
}

/**
 * The second a bundle was recorded, read off its name.
 *
 * Two naming schemes are on disk and both carry the same 14 digits — `2026-08-13-19-34-23` from
 * the transfer and `VID_20260802_222741` from the phone's own camera roll. On the raw name the
 * letter sorts above every digit, which put the OLDEST recordings at the top of both queues.
 */
export const recordedAt = (name: string) => name.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);

/** Newest first, ties broken by the name so the order never depends on the readdir. */
const newestFirst = (rows: QueueRow[]) =>
  [...rows].sort((a, b) => recordedAt(b.name).localeCompare(recordedAt(a.name)) || b.name.localeCompare(a.name));

/**
 * Who waits on whom.
 *
 * Useless and archived games are out of every queue and out of the bare count: both flags mean
 * "not my work right now", and a queue that still lists them is what the flags exist to prevent.
 */
export function splitQueues(rows: QueueRow[]): Queues {
  const live = newestFirst(rows.filter((r) => !r.chain.useless && !r.archived));
  return {
    confirm: live.filter((r) => r.chain.step === "confirm"),
    labeln: live.filter((r) => r.chain.step === "labeln"),
    blocked: live.filter((r) => r.chain.step === "label" && r.chain.video !== null),
    bare: live.filter(isBare),
  };
}

/**
 * Review PNGs on disk, but only for a bundle that has nothing else.
 *
 * A readdir per card is wasted on games whose card already shows a video, a candidate and a
 * progress bar; on a bare bundle the frame count is the whole answer to "is this worth keeping".
 */
export async function bareFrames(name: string, chain: ChainState): Promise<number> {
  if (chain.video !== null || chain.hasCandidate) return 0;
  return (await listFrameStems(name)).length;
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
      const [chain, meta, candidate] = await Promise.all([
        chainState(name),
        loadMeta(name),
        loadCandidate(name).catch(() => null),
      ]);
      return {
        name,
        title: meta.title ?? null,
        plies: candidate?.moves.length ?? 0,
        frames: await bareFrames(name, chain),
        archived: meta.archived ?? false,
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
