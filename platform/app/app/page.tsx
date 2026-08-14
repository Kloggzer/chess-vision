import Link from "next/link";
import { chainState } from "@/lib/chain";
import { jobs, type Job } from "@/lib/jobs";
import { judgedKeys } from "@/lib/corrections";
import { listGames, loadCandidate, truthSans } from "@/lib/data";
import { loadMeta } from "@/lib/meta";
import { loadProposals, proposalKey } from "@/lib/proposals";
import { sessionId } from "@/lib/session";
import { GameCard, type GameInfo } from "./cards";

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

export default async function Home() {
  // One read of the job ledger for the whole list, not one per card.
  const recent = new Map((await jobs(200)).map((job) => [job.name, job]));
  const games = await Promise.all((await listGames()).map((name) => gameInfo(name, recent.get(name) ?? null)));
  const active = games.filter((g) => !g.archived);
  const archived = games.filter((g) => g.archived);

  return (
    <main className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Real-game candidates</h1>
        <Link className="text-muted-foreground text-sm underline" href="/transfers">
          transfers from the phone
        </Link>
      </div>
      <ul className="space-y-2">
        {active.map((game) => (
          <GameCard game={game} key={game.name} />
        ))}
      </ul>
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
