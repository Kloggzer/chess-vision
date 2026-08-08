import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { decidedKeys } from "@/lib/corrections";
import { listGames } from "@/lib/data";
import { loadProposals, proposalKey } from "@/lib/proposals";
import { sessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Decided = the proposal has a row in corrections.jsonl. A KEEP writes nothing by design
 *  (specs/53-03: no rows for confirmations that only repeat the FEN), so it cannot count here. */
async function progress(name: string) {
  const { rows, source } = await loadProposals(name);
  if (rows.length === 0) return { total: 0, done: 0, source };
  const decided = await decidedKeys(sessionId(name));
  return { total: rows.length, done: rows.filter((r) => decided.has(proposalKey(r))).length, source };
}

export default async function Home() {
  const games = await listGames();
  const rows = await Promise.all(games.map(async (name) => ({ name, ...(await progress(name)) })));

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Real-game candidates</h1>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3" key={row.name}>
            <Link className="font-medium underline underline-offset-4" href={`/confirm/${row.name}`}>
              {row.name}
            </Link>
            {row.total === 0 ? (
              <span className="text-muted-foreground text-sm">no occluded proposals yet</span>
            ) : (
              <>
                <Link className="text-sm underline underline-offset-4" href={`/relabel/${row.name}`}>
                  relabel
                </Link>
                <span className="text-muted-foreground text-sm">
                  {row.done} of {row.total} proposals decided
                </span>
                <span className="bg-muted h-2 w-40 overflow-hidden rounded">
                  <span
                    className="bg-primary block h-full"
                    style={{ width: `${Math.round((row.done / row.total) * 100)}%` }}
                  />
                </span>
                {row.source === "fixture" ? <Badge variant="destructive">fixture</Badge> : null}
              </>
            )}
          </li>
        ))}
      </ul>
      {games.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nothing under <code>$CHESSLAB_DATA_DIR/realgames</code>. Check <code>.env.local</code>.
        </p>
      )}
    </main>
  );
}
