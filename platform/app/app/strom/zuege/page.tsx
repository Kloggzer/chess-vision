import { queueRows, splitQueues } from "@/lib/chain/queues";
import { streamGame } from "@/lib/label/review-read";
import { ZuegeStream } from "./stream";

export const dynamic = "force-dynamic";

export default async function ZuegePage() {
  const queues = splitQueues(await queueRows());
  // The queue's own order IS the stream's: newest recording first, `useless` and archived out.
  const games = await Promise.all(queues.confirm.map(streamGame));

  return <ZuegeStream games={games} />;
}
