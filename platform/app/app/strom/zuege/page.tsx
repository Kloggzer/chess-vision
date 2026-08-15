import { QueueNav } from "@/app/queue-nav";
import { listFrameStems, loadCandidate, truthSans } from "@/lib/data";
import { lcsReport } from "@/lib/lcs";
import { queueRows, splitQueues, type QueueRow } from "@/lib/queues";
import { buildGalleryCards, buildReviewCards } from "@/lib/review-cards";
import { badIntervals } from "@/lib/review-notes";
import { sessionId } from "@/lib/session";
import type { StreamGame } from "@/lib/zuege";
import { ZuegeStream } from "./stream";

export const dynamic = "force-dynamic";

/**
 * One pending game, read exactly as `/confirm/<name>` reads it.
 *
 * The stream changes WHERE the cards are answered, never how they are built: same LCS, same
 * windows, same wire (CONCEPT.md §10.3 — the confirm review logic is a non-goal).
 */
async function streamGame(row: QueueRow): Promise<StreamGame> {
  const candidate = await loadCandidate(row.name);
  const truth = await truthSans(row.name);
  const moves = candidate.moves;
  const { matched, invented, missed } = truth
    ? lcsReport(truth, moves.map((m) => m.san))
    : { matched: [] as [number, number][], invented: moves.map((_, i) => i), missed: [] };
  const missedSans = new Set(missed.map((i) => truth?.[i] ?? ""));
  const stems = await listFrameStems(row.name);
  return {
    name: row.name,
    title: row.title,
    sessionId: sessionId(row.name),
    plies: moves.length,
    cards: buildReviewCards({ moves, indices: invented, stems, startFen: candidate.start_fen, missedSans }),
    gallery: buildGalleryCards({ moves, matched, stems, startFen: candidate.start_fen }),
    noted: [...(await badIntervals(sessionId(row.name)))],
  };
}

export default async function ZuegePage() {
  const queues = splitQueues(await queueRows());
  // The queue's own order IS the stream's: newest recording first, `useless` and archived out.
  const games = await Promise.all(queues.confirm.map(streamGame));

  return (
    <main className="space-y-4">
      <QueueNav counts={{ confirm: queues.confirm.length, relabel: queues.relabel.length }} here="zuege" />
      <ZuegeStream games={games} />
    </main>
  );
}
