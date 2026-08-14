import { queueRows, splitQueues } from "@/lib/queues";
import { QueueNav } from "@/app/queue-nav";
import { QueueRowItem } from "@/app/queue-row";

export const dynamic = "force-dynamic";

export default async function ConfirmQueuePage() {
  const queues = splitQueues(await queueRows());
  const counts = { confirm: queues.confirm.length, relabel: queues.relabel.length };

  return (
    <main className="space-y-4">
      <QueueNav counts={counts} here="confirm" />
      <h1 className="text-2xl font-semibold">Zu bestätigen ({queues.confirm.length})</h1>
      <p className="text-muted-foreground text-sm">
        Jede Partie, deren nächster Schritt <code>confirm</code> ist: der Tracker hat gelesen, ein
        Mensch hat noch nicht geurteilt. Neueste zuerst.
      </p>
      <ul className="space-y-2">
        {queues.confirm.map((row) => (
          <QueueRowItem href={`/confirm/${row.name}`} key={row.name} row={row} />
        ))}
      </ul>
      {queues.confirm.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nichts wartet auf ein Urteil.</p>
      ) : null}
    </main>
  );
}
