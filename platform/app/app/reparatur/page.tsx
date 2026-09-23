import Link from "next/link";
import { ChainActions } from "@/app/chain-actions";
import { PageTitle } from "@/app/page-title";
import { ListRow } from "@/components/list-row";
import { chainStates } from "@/lib/chain/chain";
import { STEP } from "@/lib/chain/steps";
import { repairs } from "@/lib/chain/drain";
import { failureParts, logName } from "@/lib/failure";
import { jobs } from "@/lib/chain/jobs";

export const dynamic = "force-dynamic";

// A failed step is never taken again by a button — only a fix, or a press on the card here.
export default async function RepairPage() {
  const [repair, ledger] = await Promise.all([repairs(), jobs(500)]);
  const lastJobs = new Map(ledger.map((job) => [job.name, job]));
  const states = await chainStates(repair.map((row) => row.name));
  const rows = repair.map((row, i) => ({ ...row, state: states[i], lastJob: lastJobs.get(row.name) ?? null }));

  return (
    <main className="space-y-4">
      <PageTitle
        count={rows.length}
        title="Reparatur"
        why="Schritte, die kein Knopf mehr anfasst: ein gescheiterter Schritt wird nie wiederholt. Hier steht, woran er gescheitert ist, und der Knopf daneben ist der Mensch."
      />
      <ul className="space-y-1.5">
        {rows.map((row) => {
          // The card's own control prints the ledger's reason; only a reason the ledger lacks is printed here.
          const failure = row.reason !== row.lastJob?.reason ? failureParts(row.reason) : null;
          return (
            <ListRow key={row.name}>
              <span className="flex min-w-52 flex-col gap-0.5">
                <span className="font-medium">{row.name}</span>
                <span className="text-muted-foreground text-xs">
                  {STEP[row.step].label}
                  {row.lastJob?.lens === false ? " · ohne Linsen-Korrektur" : ""}
                </span>
              </span>
              <ChainActions lastJob={row.lastJob} name={row.name} showWhat={false} state={row.state} />
              <Link className="text-muted-foreground ml-auto shrink-0 text-xs hover:underline hover:underline-offset-4" href={`/game/${row.name}`}>
                Job-Log →
              </Link>
              {failure ? (
                <span className="text-destructive w-full text-xs break-words">
                  {failure.text}
                  {failure.log ? ` — ${logName(failure.log)}` : ""}
                </span>
              ) : null}
            </ListRow>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="text-muted-foreground text-sm">Nichts kaputt.</p> : null}
    </main>
  );
}
