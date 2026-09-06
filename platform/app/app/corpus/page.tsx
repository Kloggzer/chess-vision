import { stat } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { PageTitle } from "@/app/page-title";
import { SEGMENTS, segment } from "@/components/segmented";
import { LEGACY_LABEL } from "@/lib/classes";
import { classScheme, corpusIndex, datasetDir, listDatasets, loadDatasetMeta, trainShares, type DatasetEntry } from "@/lib/corpus";
import { listPacks, sessionDirty } from "@/lib/packs";
import { groupByPack, loadPerf, sweepLog } from "@/lib/perf";
import { loadPool, occludedFit, snapshotOccluded, type Pool } from "@/lib/pool";
import { modelReadProvenance, summarize } from "@/lib/provenance";
import { BalanceCard, D2Banner, LightBlock, PacksBlock, PoolCard, SharesBlock, Tiles, VetoStrip, type DatasetView } from "./sections";

export const dynamic = "force-dynamic";

const MUTED = "text-muted-foreground text-xs";

const LEGEND =
  "POOL — was Ledger und Sessions ergäben, wenn jetzt geschnitten würde. " +
  "SNAPSHOT — was ein gebauter Datensatz enthält, eingefroren zur Bauzeit. " +
  "DIFF — was ein Rebuild HEUTE hinzufügen oder verlieren würde. " +
  "Ein Datensatz zur Zeit: der Index über ein 57-MB-Manifest wird nur für den gewählten gelesen.";

/** One dataset at a time — an index rebuild streams a 57 MB manifest, and six at once is the memory
 * mistake the single job slot exists to avoid. */
async function datasetView(name: string, entries: DatasetEntry[], pool: Pool): Promise<DatasetView | null> {
  const split = entries.find((entry) => entry.name === name)?.split;
  if (!split) return null;
  const index = await corpusIndex(name);
  const shares = trainShares(index, split);
  const scheme = classScheme(split, await loadDatasetMeta(name));
  // Only a snapshot that HAS the bucket can be measured against the pool's occluded cells.
  const carries = (split.classes ?? []).includes(LEGACY_LABEL);
  const fit = carries ? occludedFit(pool, snapshotOccluded(index, split)) : null;
  return { name, split, scheme, index, shares, fit, hasReal: shares.rows.some((row) => row.real) };
}

/** Default is the dataset whose `split.json` was written last — the one a rebuild just produced. */
async function newest(entries: DatasetEntry[]): Promise<string | null> {
  const times = await Promise.all(
    entries.map((entry) => stat(path.join(datasetDir(entry.name), "split.json")).then((s) => s.mtimeMs, () => 0)),
  );
  const best = times.reduce((top, time, i) => (time > times[top] ? i : top), 0);
  return entries[best]?.name ?? null;
}

function Chips({ names, current }: { names: string[]; current: string | null }) {
  return (
    <nav className={SEGMENTS}>
      {names.map((name, i) => (
        <Link
          aria-current={name === current ? "true" : undefined}
          className={`${segment(name === current, true, i === 0)} flex shrink-0 items-center font-mono`}
          href={`/corpus?d=${encodeURIComponent(name)}`}
          key={name}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}

export default async function CorpusPage({ searchParams }: PageProps<"/corpus">) {
  const [pool, datasets, wanted] = await Promise.all([loadPool(), listDatasets(), searchParams]);
  const built = datasets.filter((entry) => entry.split !== null);
  const asked = typeof wanted.d === "string" ? wanted.d : null;
  const selected = built.some((entry) => entry.name === asked) ? asked : await newest(built);
  const view = selected ? await datasetView(selected, built, pool) : null;
  const [entries, bundles, dirty, perf, sweep] = await Promise.all([
    modelReadProvenance(),
    listPacks(),
    sessionDirty(),
    loadPerf(),
    sweepLog(),
  ]);
  const bare = datasets.filter((entry) => entry.split === null);

  return (
    <main className="space-y-4">
      <PageTitle title="Korpus" why={LEGEND} />
      <Chips current={selected} names={built.map((entry) => entry.name)} />
      <Tiles pool={pool} provenance={summarize(entries)} view={view} />

      {view ? (
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <BalanceCard pool={pool} view={view} />
            <PoolCard pool={pool} view={view} />
          </div>
          <SharesBlock view={view} />
        </div>
      ) : (
        <p className={MUTED}>Kein Datensatz mit <code>split.json</code> auf der Platte.</p>
      )}

      <PacksBlock bundles={bundles} dirty={dirty} />
      <VetoStrip groups={groupByPack(perf)} sweep={sweep} />
      <LightBlock />
      <D2Banner entries={entries} summary={summarize(entries)} />
      {bare.length > 0 ? (
        <details className={MUTED}>
          <summary className="cursor-pointer max-sm:min-h-11">
            {bare.length} Verzeichnisse unter <code>data/datasets/</code> ohne <code>split.json</code> — ohne
            Balance-Angaben
          </summary>
          <p className="mt-1 font-mono">{bare.map((entry) => entry.name).join(" · ")}</p>
        </details>
      ) : null}
    </main>
  );
}
