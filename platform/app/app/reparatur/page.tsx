import { chainState } from "@/lib/chain";
import { failureParts } from "@/lib/failure";
import { repairPlan } from "@/lib/autopilot-engine";
import { jobs } from "@/lib/jobs";
import { ChainActions } from "@/app/chain-actions";
import { PageTitle } from "@/app/page-title";

export const dynamic = "force-dynamic";

// Failed steps never retry automatically — only manual press or fix moves them out.
export default async function RepairPage() {
  const [repair, ledger] = await Promise.all([repairPlan(), jobs(500)]);
  const lastJobs = new Map(ledger.map((job) => [job.name, job]));
  const rows = await Promise.all(
    repair.map(async (row) => ({ ...row, state: await chainState(row.name), lastJob: lastJobs.get(row.name) ?? null })),
  );

  return (
    <main className="space-y-4">
      <PageTitle
        count={rows.length}
        title="Reparatur"
        why="Schritte, die der Autopilot nicht mehr von selbst anfasst. Ein gescheiterter Schritt wird nie automatisch wiederholt — hier steht, woran er gescheitert ist, und der Knopf daneben ist der Mensch."
      />
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li className="border-border space-y-1 rounded-lg border px-3 py-2 text-sm" key={row.name}>
            <div className="flex flex-wrap items-center gap-x-3">
              <span className="font-medium">{row.name}</span>
              <span className="text-muted-foreground font-mono text-xs">{row.step}</span>
              {row.lastJob?.lens === false ? (
                <span className="text-muted-foreground text-xs">gelabelt OHNE Linsen-Korrektur</span>
              ) : null}
            </div>
            {row.reason !== row.lastJob?.reason ? (
              <p className="text-destructive text-xs">{failureParts(row.reason).text}</p>
            ) : null}
            <ChainActions lastJob={row.lastJob} name={row.name} state={row.state} />
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-muted-foreground text-sm">Nichts kaputt.</p> : null}
    </main>
  );
}
