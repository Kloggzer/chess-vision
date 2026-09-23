import { Progress } from "@/components/progress";
import { gameInfo, type GameInfo } from "@/lib/chain/game-info";
import { jobs } from "@/lib/chain/jobs";
import { listGames } from "@/lib/session-store/recordings";
import { splitQueues, type QueueRow } from "@/lib/chain/queues";
import { BareBundles } from "./bare-bundles";
import { GameCard } from "./cards";
import { PageTitle } from "./page-title";

export const dynamic = "force-dynamic";

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
  const games = await Promise.all(
    (await listGames()).map(async (name) => (await gameInfo(name, recent.get(name) ?? null)).info),
  );
  const rows = games.map(rowOf);
  const queues = splitQueues(rows);
  const bare = new Set(queues.bare.map((r) => r.name));
  // A bare bundle offers nothing and every one of them looks the same — they belong in the one
  // collapsed row below, not in the list a human scans for work.
  const active = games.filter(
    (g) => !g.archived && !bare.has(g.name) && g.chain.useless === null,
  );
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
        why="Jede Aufnahme durchläuft dieselbe Kette: Züge erkennen → Züge prüfen → Bretter ausschneiden → Hände matten → Modell prüfen lassen → Zellen labeln. Jede Karte zeigt nur den Schritt, der jetzt dran ist, und sagt, was er tut. Die tägliche Arbeit läuft über die Ströme links — diese Liste ist Ablage und Drilldown: Titel, PGN, nutzlos, Archiv."
      >
        {boards > 0 ? (
          <Progress
            bar="w-32"
            done={boardsDone}
            total={boards}
            unit="Bretter"
          />
        ) : null}
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
          Nichts unter <code>$CHESSLAB_DATA_DIR/recordings</code> —{" "}
          <code>.env.local</code> prüfen.
        </p>
      )}
    </main>
  );
}
