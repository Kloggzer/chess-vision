import { ChainActions } from "@/app/chain-actions";
import { BareBundles } from "@/app/bare-bundles";
import { QueueNav } from "@/app/queue-nav";
import { QueueRowItem } from "@/app/queue-row";
import { queueRows, splitQueues, type QueueRow } from "@/lib/queues";
import { UselessButton } from "@/app/useless-button";

export const dynamic = "force-dynamic";

/**
 * A game with a recording and no candidate, with the button that would start it.
 *
 * The honest answer to "why is nothing here to label" is usually "because the machine step in
 * front of it never ran", so the second section names those games AND offers the step, rather
 * than leaving an empty queue that looks like a bug.
 */
function BlockedRow({ row }: { row: QueueRow }) {
  return (
    <li className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm">
      <span className="font-mono text-xs">{row.name}</span>
      <ChainActions name={row.name} state={row.chain} />
      <span className="text-muted-foreground ml-auto text-xs">
        <UselessButton flagged={false} name={row.name} />
      </span>
    </li>
  );
}

export default async function LabelingQueuePage() {
  const queues = splitQueues(await queueRows());
  const counts = { confirm: queues.confirm.length, relabel: queues.relabel.length };

  return (
    <main className="space-y-6">
      <QueueNav counts={counts} here="relabel" />

      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Zu labeln ({queues.relabel.length})</h1>
        <p className="text-muted-foreground text-sm">
          Partien mit Proposals: Bucket, Tinder und der Brett-Pinsel warten. Neueste zuerst.
        </p>
        <ul className="space-y-2">
          {queues.relabel.map((row) => (
            <QueueRowItem href={`/relabel/${row.name}`} key={row.name} row={row} />
          ))}
        </ul>
        {queues.relabel.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nichts zu labeln — die Kette liefert erst nach <code>confirm</code>, <code>export</code>{" "}
            und <code>propose</code> Vorschläge.
          </p>
        ) : null}
      </section>

      {queues.blocked.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Noch nicht gelesen ({queues.blocked.length})</h2>
          <p className="text-muted-foreground text-sm">
            Aufnahme da, <code>candidate.json</code> nicht: der Tracker-Replay lief hier nie. Deshalb
            ist oben nichts zu sehen.
          </p>
          <ul className="space-y-2">
            {queues.blocked.map((row) => (
              <BlockedRow key={row.name} row={row} />
            ))}
          </ul>
        </section>
      ) : null}

      <BareBundles rows={queues.bare} />
    </main>
  );
}
