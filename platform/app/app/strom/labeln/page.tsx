import { QueueNav } from "@/app/queue-nav";
import { loadLabelStream } from "@/lib/label-stream";
import { queueRows, splitQueues } from "@/lib/queues";
import { LabelnStream } from "./stream";

export const dynamic = "force-dynamic";

export default async function LabelnPage() {
  const [stream, queues] = await Promise.all([
    loadLabelStream(),
    queueRows().then(splitQueues),
  ]);

  return (
    <main className="space-y-4">
      <QueueNav counts={{ confirm: queues.confirm.length, relabel: queues.relabel.length }} here="relabel" />
      <LabelnStream stream={stream} />
    </main>
  );
}
