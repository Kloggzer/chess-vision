import { Progress } from "@/components/progress";
import { chainState } from "@/lib/chain";
import { jobs, type Job } from "@/lib/jobs";
import { judgedKeys } from "@/lib/corrections";
import { listGames, loadCandidate, truthSans } from "@/lib/data";
import { loadMeta } from "@/lib/meta";
import { boardProgressOf, loadModelReads, readKey } from "@/lib/model-reads";
import { bareFrames, splitQueues, type QueueRow } from "@/lib/queues";
import { sessionId } from "@/lib/session";
import { BareBundles } from "./bare-bundles";
import { GameCard, type GameInfo } from "./cards";
import { PageTitle } from "./page-title";

export const dynamic = "force-dynamic";

/** BRETTER first, cells second (CONCEPT.md 6.2): the board is the unit a human clears. */
async function progress(name: string) {
  const decided = await judgedKeys(name);
  const { census, boards, done } = await boardProgressOf(name, decided.keys());
  const { rows } = await loadModelReads(name);
  return {
    boards,
    boardsDone: done,
    cells: census.cells,
    cellsDone: rows.filter((r) => decided.has(readKey(r))).length,
    measured: census.present,
  };
}

async function gameInfo(name: string, lastJob: Job | null): Promise<GameInfo> {
  const meta = await loadMeta(name);
  const candidate = await loadCandidate(name).catch(() => null);
  const chain = await chainState(name);
  const pgn = await truthSans(name).catch(() => null);
  return {
    name,
    sessionId: sessionId(name),
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

  const boards = active.reduce((n, g) => n + g.boards, 0);
  const boardsDone = active.reduce((n, g) => n + g.boardsDone, 0);

  return (
    <main className="space-y-4">
      <PageTitle
        count={active.length}
        title="Partien"
        why="Jede Aufnahme mit ihrem nächsten Schritt. Die tägliche Arbeit läuft über die Ströme links — diese Liste ist Ablage und Drilldown: Titel, PGN, nutzlos, Archiv."
      >
        {boards > 0 ? <Progress bar="w-32" done={boardsDone} total={boards} unit="Bretter" /> : null}
      </PageTitle>
      <ul className="space-y-1.5">
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
          Nichts unter <code>$CHESSLAB_DATA_DIR/recordings</code> — <code>.env.local</code> prüfen.
        </p>
      )}
    </main>
  );
}
