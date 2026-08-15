import { chainState } from "@/lib/chain";
import { jobs, type Job } from "@/lib/jobs";
import { judgedKeys } from "@/lib/corrections";
import { listGames, loadCandidate, truthSans } from "@/lib/data";
import { loadMeta } from "@/lib/meta";
import { loadProposals, proposalKey } from "@/lib/proposals";
import { boardProgressOf } from "@/lib/proposal-summaries";
import { bareFrames, splitQueues, type QueueRow } from "@/lib/queues";
import { sessionId } from "@/lib/session";
import { BareBundles } from "./bare-bundles";
import { GameCard, type GameInfo } from "./cards";
import { QueueNav } from "./queue-nav";

export const dynamic = "force-dynamic";

/**
 * BRETTER first, cells second (CONCEPT.md 6.2, D1): a board is the unit a human clears, and the
 * cell count is a function of `hi`/`lo`, so a re-propose would silently rewrite how much work is
 * done. Decided = the cell has a row in one of the two ledgers (corrections OR reviewed); a board
 * counts as touched as soon as any of its cells does.
 *
 * This is a LIST of nine sessions: with a sidecar it must not parse a single proposal row, which
 * is why `cellsDone` is `null` there — that one figure needs the cell keys, and the sidecar has
 * counts. A fixture has no sidecar, so its rows are read and the number is exact.
 */
async function progress(name: string) {
  const decided = await judgedKeys(sessionId(name));
  const { summary, boards, done } = await boardProgressOf(name, decided.keys());
  if (summary.read === "none") {
    return { boards: 0, boardsDone: 0, cells: 0, cellsDone: 0, source: "none" as const, read: summary.read };
  }
  if (summary.read === "sidecar") {
    return { boards, boardsDone: done, cells: summary.cells, cellsDone: null, source: "pack" as const, read: summary.read };
  }
  const { rows, source } = await loadProposals(name);
  return {
    boards,
    boardsDone: done,
    cells: rows.length,
    cellsDone: rows.filter((r) => decided.has(proposalKey(r))).length,
    source,
    read: summary.read,
  };
}

async function gameInfo(name: string, lastJob: Job | null): Promise<GameInfo> {
  const meta = await loadMeta(name);
  const candidate = await loadCandidate(name).catch(() => null);
  const chain = await chainState(name);
  const pgn = await truthSans(name).catch(() => null);
  return {
    name,
    title: meta.title ?? null,
    archived: meta.archived ?? false,
    frames: await bareFrames(name, chain),
    createdAt: candidate?.created_at ?? null,
    confirmed: candidate?.confirmed ?? false,
    confirmedAt: candidate?.confirmed_at ?? null,
    plies: candidate?.moves.length ?? 0,
    reviewed: candidate?.reviewed_plies?.length ?? 0,
    pgnPlies: pgn ? pgn.length : null,
    chain,
    lastJob,
    ...(await progress(name)),
  };
}

/** The same row the queue pages split — built from what this page already read, not re-read. */
const rowOf = (game: GameInfo): QueueRow => ({
  name: game.name,
  title: game.title,
  plies: game.plies,
  frames: game.frames,
  archived: game.archived,
  chain: game.chain,
});

export default async function Home() {
  // One read of the job ledger for the whole list, not one per card.
  const recent = new Map((await jobs(200)).map((job) => [job.name, job]));
  const games = await Promise.all((await listGames()).map((name) => gameInfo(name, recent.get(name) ?? null)));
  const rows = games.map(rowOf);
  const queues = splitQueues(rows);
  const bare = new Set(queues.bare.map((r) => r.name));
  // A bare bundle offers nothing and every one of them looks the same — they belong in the one
  // collapsed row below, not in the list a human scans for work.
  const active = games.filter((g) => !g.archived && !bare.has(g.name) && g.chain.useless === null);
  const archived = games.filter((g) => g.archived);
  // Flagged-but-bare games stay in the useless list: the undo has to be findable.
  const useless = games.filter((g) => !g.archived && g.chain.useless !== null);

  return (
    <main className="space-y-4">
      <QueueNav counts={{ confirm: queues.confirm.length, relabel: queues.relabel.length }} here="home" />
      <h1 className="text-2xl font-semibold">Real-game candidates</h1>
      <ul className="space-y-2">
        {active.map((game) => (
          <GameCard game={game} key={game.name} />
        ))}
      </ul>
      <BareBundles rows={queues.bare} />
      {useless.length > 0 ? (
        <details>
          <summary className="text-muted-foreground cursor-pointer text-sm">
            nutzlos ({useless.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {useless.map((game) => (
              <GameCard game={game} key={game.name} />
            ))}
          </ul>
        </details>
      ) : null}
      {archived.length > 0 ? (
        <details>
          <summary className="text-muted-foreground cursor-pointer text-sm">
            archiviert ({archived.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {archived.map((game) => (
              <GameCard game={game} key={game.name} />
            ))}
          </ul>
        </details>
      ) : null}
      {games.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nothing under <code>$CHESSLAB_DATA_DIR/realgames</code>. Check <code>.env.local</code>.
        </p>
      )}
    </main>
  );
}
