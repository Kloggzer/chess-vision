import Link from "next/link";
import { PageTitle } from "@/app/page-title";
import { failedCount, finishedCount, groupIntake, intakeCount, parseOnly, visibleGroups } from "@/lib/intake";
import { jobs } from "@/lib/jobs";
import { queueRows } from "@/lib/queues";
import { IntakeStepper } from "./filters";
import { IntakeRowItem } from "./row";

export const dynamic = "force-dynamic";

const WHY =
  "Jede Aufnahme wartet in genau einer Stufe der Kette. Die Stufen oben sind zugleich der Filter; die Adresse trägt ihn und lässt sich verschicken.";

export default async function EinpflegenPage({ searchParams }: { searchParams: Promise<{ nur?: string; gescheitert?: string }> }) {
  const [rows, recent, wanted] = await Promise.all([queueRows(), jobs(200), searchParams]);
  const groups = groupIntake(rows, new Map(recent.map((job) => [job.name, job])));
  const only = parseOnly(wanted.nur);
  const failedOnly = wanted.gescheitert === "1";
  const shown = visibleGroups(groups, only, failedOnly);
  const finished = finishedCount(groups);
  // The finished pile is the largest group and needs no button — one line, unless asked for by name.
  const summariseFinished = !only.includes("labeln") || only.length === groups.length;

  return (
    <main className="space-y-5">
      <PageTitle count={intakeCount(rows)} title="Einpflegen" why={WHY}>
        {finished > 0 ? <span className="text-muted-foreground tabular-nums">{finished} fertig im Strom</span> : null}
      </PageTitle>
      <IntakeStepper failed={failedCount(groups)} failedOnly={failedOnly} groups={groups} only={only} />
      {shown
        .filter((group) => !(summariseFinished && group.key === "labeln"))
        .map((group) => (
          <section className="space-y-2" key={group.key}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h2 className="text-[15px] font-semibold tracking-tight">{group.label}</h2>
              <span className="text-muted-foreground text-sm tabular-nums">{group.rows.length}</span>
              <span className="text-muted-foreground text-xs">{group.what}</span>
            </div>
            <ul className="space-y-1.5">
              {group.rows.map((row) => (
                <IntakeRowItem key={row.name} row={row} />
              ))}
            </ul>
          </section>
        ))}
      {shown.length === 0 ? <p className="text-muted-foreground text-sm">Nichts wartet — alles, was unterwegs war, ist durch.</p> : null}
      {summariseFinished && finished > 0 && !failedOnly ? (
        <div className="border-border text-muted-foreground flex items-center gap-3 border-t pt-4 text-sm">
          <span className="tabular-nums">{finished} Aufnahmen sind durch die Kette und warten im Strom.</span>
          <Link className="text-foreground ml-auto hover:underline hover:underline-offset-4" href="/strom/labeln">
            Zellen labeln →
          </Link>
        </div>
      ) : null}
    </main>
  );
}
