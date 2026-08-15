import { chainState } from "@/lib/chain";
import { failureParts } from "@/lib/failure";
import { repairPlan } from "@/lib/autopilot-engine";
import { jobs } from "@/lib/jobs";
import { queueRows, splitQueues } from "@/lib/queues";
import { ChainActions } from "@/app/chain-actions";
import { QueueNav } from "@/app/queue-nav";

export const dynamic = "force-dynamic";

// Failed steps never retry automatically — only manual press or fix moves them out.
export default async function RepairPage() {
  const [repair, queues, ledger] = await Promise.all([repairPlan(), queueRows().then(splitQueues), jobs(500)]);
  const counts = { confirm: queues.confirm.length, relabel: queues.relabel.length };
  const lastJobs = new Map(ledger.map((job) => [job.name, job]));
  const rows = await Promise.all(
    repair.map(async (row) => ({ ...row, state: await chainState(row.name), lastJob: lastJobs.get(row.name) ?? null })),
  );

  return (
    <main className="space-y-4">
      <QueueNav counts={counts} here="reparatur" />
      <h1 className="text-2xl font-semibold">Reparatur ({rows.length})</h1>
      <p className="text-muted-foreground text-sm">
        Schritte, die der Autopilot nicht mehr von selbst anfasst. Ein gescheiterter Schritt wird nie
        automatisch wiederholt — hier steht, woran er gescheitert ist, und der Knopf daneben ist der
        Mensch.
      </p>
      <ul className="space-y-2">
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
