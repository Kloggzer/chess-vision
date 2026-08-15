import { QueueNav } from "@/app/queue-nav";
import { corpusIndex, listDatasets, trainShares, type DatasetEntry } from "@/lib/corpus";
import { listPacks, sessionDirty } from "@/lib/packs";
import { groupByPack, loadPerf, sweepLog } from "@/lib/perf";
import { loadPool, occludedFit, snapshotOccluded, type Pool } from "@/lib/pool";
import { proposalProvenance, summarize } from "@/lib/provenance";
import { queueRows, splitQueues } from "@/lib/queues";
import { BalanceCard, D2Banner, LightBlock, PacksBlock, SharesBlock, VetoStrip, type DatasetView } from "./sections";

export const dynamic = "force-dynamic";

const MUTED = "text-muted-foreground text-xs";

/** Sequential on purpose: an index rebuild streams a 57 MB manifest, and two at once is the memory
 * mistake the single job slot exists to avoid. Only datasets with a `split.json` can be balanced. */
async function datasetViews(entries: DatasetEntry[], pool: Pool): Promise<DatasetView[]> {
  const views: DatasetView[] = [];
  for (const { name, split } of entries) {
    if (!split) continue;
    const index = await corpusIndex(name);
    const shares = trainShares(index, split);
    const snapshot = snapshotOccluded(index, split);
    views.push({ name, split, index, shares, fit: occludedFit(pool, snapshot), hasReal: shares.rows.some((row) => row.real) });
  }
  return views;
}

export default async function CorpusPage() {
  const pool = await loadPool();
  const datasets = await listDatasets();
  const views = await datasetViews(datasets, pool);
  const [entries, bundles, dirty, perf, sweep, rows] = await Promise.all([
    proposalProvenance(),
    listPacks(),
    sessionDirty(),
    loadPerf(),
    sweepLog(),
    queueRows(),
  ]);
  const queues = splitQueues(rows);
  const bare = datasets.filter((entry) => entry.split === null);

  return (
    <main className="space-y-6">
      <QueueNav counts={{ confirm: queues.confirm.length, relabel: queues.relabel.length }} here="corpus" />
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Korpus</h1>
        <div className="text-muted-foreground grid gap-2 text-xs sm:grid-cols-3">
          <p>
            <span className="text-foreground">POOL</span> — was Ledger und Sessions ergäben, wenn jetzt geschnitten würde
          </p>
          <p>
            <span className="text-foreground">SNAPSHOT</span> — was ein gebauter Datensatz enthält, eingefroren zur Bauzeit
          </p>
          <p>
            <span className="text-foreground">DIFF</span> — was ein Rebuild HEUTE hinzufügen oder verlieren würde
          </p>
        </div>
      </div>

      <D2Banner entries={entries} summary={summarize(entries)} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Klassenbalance</h2>
        {views.map((view) => (
          <BalanceCard key={view.name} pool={pool} view={view} />
        ))}
        {bare.length > 0 ? (
          <details className={MUTED}>
            <summary className="max-sm:h-11 max-sm:leading-[2.75rem] cursor-pointer">
              {bare.length} Verzeichnisse unter <code>data/datasets/</code> ohne <code>split.json</code> — ohne
              Balance-Angaben
            </summary>
            <p className="mt-1 font-mono">{bare.map((entry) => entry.name).join(" · ")}</p>
          </details>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Anteil je Session</h2>
        {views.filter((view) => view.hasReal).map((view) => (
          <SharesBlock key={view.name} view={view} />
        ))}
        <p className={MUTED}>
          Gezeigt werden nur Datensätze mit Realpartien im train-Split; für Turntable-, Synth- und Phone-Packs stellt sich
          die Ergänzungsfrage nicht. Gezählt wird <code>manifest.jsonl</code> nach <code>session_id</code>, mtime-gekeyt
          über <code>inbox/corpus-index/&lt;dataset&gt;.json</code>.
        </p>
      </section>

      <PacksBlock bundles={bundles} dirty={dirty} />
      <LightBlock />
      <VetoStrip groups={groupByPack(perf)} sweep={sweep} />
    </main>
  );
}
