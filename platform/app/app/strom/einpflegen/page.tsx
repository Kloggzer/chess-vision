import { PageTitle } from "@/app/page-title";
import { groupIntake, intakeCount, parseOnly } from "@/lib/intake";
import { jobs } from "@/lib/jobs";
import { queueRows } from "@/lib/queues";
import { IntakeFilters } from "./filters";
import { IntakeRowItem } from "./row";

export const dynamic = "force-dynamic";

const WHY =
  "Jede Aufnahme steht in genau einer Stufe der Kette: Züge vom Handy übernehmen oder erkennen → Züge prüfen → Bretter ausschneiden → Hände matten → Modell prüfen lassen → Zellen labeln. Hier stehen alle Aufnahmen nach der Stufe sortiert, in der sie warten; die Filter stehen in der Adresse und lassen sich verschicken.";

export default async function EinpflegenPage({ searchParams }: { searchParams: Promise<{ nur?: string; gescheitert?: string }> }) {
  const [rows, recent, wanted] = await Promise.all([queueRows(), jobs(200), searchParams]);
  const groups = groupIntake(rows, new Map(recent.map((job) => [job.name, job])));
  const only = parseOnly(wanted.nur);
  const failedOnly = wanted.gescheitert === "1";
  const shown = groups
    .filter((group) => only.includes(group.key))
    .map((group) => (failedOnly ? { ...group, rows: group.rows.filter((row) => row.failed !== null) } : group));

  return (
    <main className="space-y-4">
      <PageTitle count={intakeCount(rows)} title="Einpflegen" why={WHY} />
      <IntakeFilters counts={groups} failedOnly={failedOnly} only={only} />
      {shown.map((group) => (
        <section className="space-y-1.5" key={group.key}>
          <h2 className="text-base font-semibold tracking-tight">
            {group.label} <span className="text-muted-foreground tabular-nums">· {group.rows.length}</span>
          </h2>
          <p className="text-muted-foreground text-xs">{group.what}</p>
          <ul className="space-y-1.5">
            {group.rows.map((row) => (
              <IntakeRowItem key={row.name} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
