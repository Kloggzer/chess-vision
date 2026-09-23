import { queueRows, splitQueues } from "@/lib/chain/queues";
import { PageTitle } from "@/app/page-title";
import { QueueRowItem } from "@/app/queue-row";

export const dynamic = "force-dynamic";

export default async function ConfirmQueuePage() {
  const queues = splitQueues(await queueRows());

  return (
    <main className="space-y-4">
      <PageTitle
        count={queues.confirm.length}
        title="Zu bestätigen"
        why="Jede Partie, deren nächster Schritt confirm ist: der Tracker hat gelesen, ein Mensch hat noch nicht geurteilt. Neueste zuerst."
      />
      <ul className="space-y-1.5">
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
