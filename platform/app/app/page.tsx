import { chainState } from "@/lib/chain";
import { jobs, type Job } from "@/lib/jobs";
import { judgedKeys } from "@/lib/corrections";
import { listGames, loadCandidate, truthSans } from "@/lib/data";
import { loadMeta } from "@/lib/meta";
import { loadProposals, proposalKey } from "@/lib/proposals";
import { bareFrames, splitQueues, type QueueRow } from "@/lib/queues";
import { sessionId } from "@/lib/session";
import { BareBundles } from "./bare-bundles";
import { GameCard, type GameInfo } from "./cards";
import { QueueNav } from "./queue-nav";

export const dynamic = "force-dynamic";

/** Decided = the proposal has a row in one of the two ledgers (corrections OR reviewed). */
async function progress(name: string) {
  const { rows, source } = await loadProposals(name);
  if (rows.length === 0) return { total: 0, done: 0, source };
  const decided = await judgedKeys(sessionId(name));
  return { total: rows.length, done: rows.filter((r) => decided.has(proposalKey(r))).length, source };
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
