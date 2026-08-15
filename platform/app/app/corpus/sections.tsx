import { Badge } from "@/components/ui/badge";
import type { CorpusIndex, Shares, Split } from "@/lib/corpus";
import type { Bundle, PackSummary, SessionDirty } from "@/lib/packs";
import { decidedRatio } from "@/lib/packs";
import type { PackGroup } from "@/lib/perf";
import { agreed } from "@/lib/perf";
import type { OccludedFit, Pool } from "@/lib/pool";
import { occludedDiff } from "@/lib/pool";
import type { Provenance, ProvenanceSummary } from "@/lib/provenance";
import { num, orDash, pct } from "./format";

const CARD = "border-border space-y-2 rounded-lg border px-3 py-2";
const MUTED = "text-muted-foreground text-xs";

export type DatasetView = {
  name: string;
  split: Split;
  index: CorpusIndex;
  shares: Shares;
  fit: OccludedFit;
  /** False for turntable, synth and phone packs: their train split holds no recorded game. */
  hasReal: boolean;
};

/**
 * D2, at the top because it decides what every other number is worth.
 *
 * Two independent facts: a `model` in the `_thresholds` header (who produced the file) and `probs`
 * on the rows (whether the model's reading is in it at all). Without `probs` the `Modell ≠ FEN`
 * lane is empty on every session, whatever the rest of the page shows.
 */
export function D2Banner({ entries, summary }: { entries: Provenance[]; summary: ProvenanceSummary }) {
  return (
    <section className={CARD}>
      <h2 className="font-semibold">Provenance der Vorschläge (D2)</h2>
      <ul className="space-y-0.5 text-sm">
        <li>
          <code>model</code> im <code>_thresholds</code>-Header: {summary.withModel} von {summary.files} Dateien
        </li>
        {/* Never 0 for what nobody counted: a sidecar states no `probs` and is not a zero. */}
        <li>
          <code>probs</code> in den Zeilen: {summary.withProbs} von {summary.counted} gezählten Dateien (
          {num(summary.probRows)} von {num(summary.countedRows)} Zeilen)
          {summary.unknown > 0 ? ` · ${summary.unknown} weitere nur per Sidecar gelesen (nicht gezählt)` : ""}
        </li>
        <li>
          Sidecars <code>occluded-proposals.summary.json</code>:{" "}
          {summary.sidecars === 0 ? "— (der Producer hat noch keine geschrieben)" : `${summary.sidecars} von ${summary.files}`}
        </li>
      </ul>
      <ul className="space-y-0.5 font-mono text-xs">
        {entries.map((entry) => (
          <li className="flex flex-wrap gap-x-3" key={entry.name}>
            <span className="min-w-56">{entry.name}</span>
            <span className="tabular-nums">{orDash(entry.rows)} Zeilen</span>
            <span className="tabular-nums">probs {orDash(entry.probs)}</span>
            <span>model {entry.model ?? "—"}</span>
            <span className={MUTED}>{entry.source === "sidecar" ? "aus Sidecar" : "Datei geparst (kein Sidecar)"}</span>
          </li>
        ))}
      </ul>
      {entries.length === 0 ? <p className={MUTED}>Keine <code>occluded-proposals.jsonl</code> auf der Platte.</p> : null}
    </section>
  );
}

/** §7.1: every figure verbatim from `split.json`, plus the POOL the ledgers would yield today. */
export function BalanceCard({ view, pool }: { view: DatasetView; pool: Pool }) {
  const { split, name } = view;
  const train = split.counts?.train ?? 0;
  const classes = split.classes ?? [];
  const snapshotOccl = split.train_class_counts?.occluded ?? 0;
  const poolOccl = pool.classes.occluded ?? 0;
  const diff = occludedDiff(poolOccl, snapshotOccl);

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="font-mono font-semibold">{name}</h3>
        <span className="text-sm tabular-nums">
          train {num(train)} · val {num(split.counts?.val ?? 0)} · test {num(split.counts?.test ?? 0)} Crops
        </span>
        <Badge variant="secondary">gebaut: Snapshot, nicht live</Badge>
        <span className={`${MUTED} tabular-nums`}>manifest.jsonl {num(view.index.rows)} Zeilen</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums">
          <thead className={MUTED}>
            <tr className="text-left">
              <th className="pr-3 font-normal">Klasse</th>
              <th className="pr-3 text-right font-normal">train (Crops)</th>
              <th className="pr-3 text-right font-normal">Anteil</th>
              <th className="pr-3 text-right font-normal">class_weight</th>
              {view.hasReal ? <th className="text-right font-normal">POOL (Zellen)</th> : null}
            </tr>
          </thead>
          <tbody>
            {classes.map((klass) => (
              <tr key={klass}>
                <td className="pr-3 font-mono">{klass}</td>
                <td className="pr-3 text-right">{num(split.train_class_counts?.[klass] ?? 0)}</td>
                <td className="pr-3 text-right">{train ? pct((split.train_class_counts?.[klass] ?? 0) / train) : "—"}</td>
                <td className="pr-3 text-right">{split.class_weights?.[klass] ?? "—"}</td>
                {view.hasReal ? <td className="text-right">{num(pool.classes[klass] ?? 0)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(split.warnings ?? []).length > 0 ? (
        <ul className="text-sm">
          {split.warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      ) : (
        <p className={MUTED}>keine <code>warnings</code> in <code>split.json</code></p>
      )}

      {view.hasReal ? (
        <div className="space-y-1 text-sm">
          <p className="tabular-nums">
            POOL occluded {num(poolOccl)} Zellen ▸ SNAPSHOT occluded {num(snapshotOccl)} Crops ▸ DIFF{" "}
            <span className="font-semibold">
              {diff > 0 ? "−" : diff < 0 ? "+" : ""}
              {num(Math.abs(diff))}
            </span>{" "}
            {diff > 0 ? "Zellen fehlen dem Snapshot" : diff < 0 ? "Zellen mehr im Snapshot als im Pool" : "gleichauf"}
          </p>
          <p className="tabular-nums">
            drin:{" "}
            {view.fit.inside.length === 0
              ? "—"
              : view.fit.inside.map((hit) => `${hit.datasetSessionId} (${num(hit.crops)})`).join(" · ")}
          </p>
          <p className="tabular-nums">
            NICHT drin: {view.fit.outside.length === 0 ? "—" : view.fit.outside.join(" · ")}
          </p>
          {classes.includes("occluded") ? null : (
            <p className={MUTED}>Dieser Datensatz hat gar keine <code>occluded</code>-Klasse — der Snapshot kann keine tragen.</p>
          )}
          <p className={MUTED}>
            POOL = jede Zelle jedes exportierten Log-Frames (64 je Frame, {num(pool.frames)} Frames, {num(pool.cells)} Zellen),
            FEN-Label mit <code>corrections.jsonl</code> last-wins auf <code>(session_id, frame, square)</code>. Ein Slice
            schneidet aus einer Zelle einen Crop; {num(pool.orphans)} Korrekturzeilen liegen auf keinem exportierten Frame.
          </p>
        </div>
      ) : (
        <p className={MUTED}>keine Realpartie-Session im train-Split — POOL/DIFF ist hier nicht anwendbar.</p>
      )}
    </section>
  );
}

/** `real14-all-80-v1` → `real14-all-80-v2`; the command must name a NEW dataset, never rebuild one. */
export function nextVersion(name: string): string {
  const match = /-v(\d+)$/.exec(name);
  return match ? `${name.slice(0, -match[0].length)}-v${Number(match[1]) + 1}` : `${name}-v2`;
}

/**
 * §7.2: the share each session holds in the train split, and the two points anyone ever measured.
 *
 * The 5.3 % marker is a MEASUREMENT, not a cap — no artefact declares one, so nothing here stamps a
 * warning against it (REVIEW.md S7). The command below is the whole mechanic there is.
 */
export function SharesBlock({ view }: { view: DatasetView }) {
  const { shares, name } = view;
  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-mono font-semibold">{name}</h3>
        <span className={MUTED}>Grundsatz: Ergänzung, nie die Masse (TODO.md:203)</span>
      </div>
      <p className="text-sm tabular-nums">Anteil am train-Split ({num(shares.total)} Crops)</p>
      <ul className="space-y-0.5 text-xs">
        {shares.rows.map((row) => (
          <li className="flex items-center gap-x-2" key={row.sessionId}>
            <span className="w-56 shrink-0 truncate font-mono">{row.sessionId}</span>
            <span className="bg-muted relative h-2 w-full min-w-24 max-w-md">
              <span className="bg-foreground/70 absolute inset-y-0 left-0" style={{ width: `${row.share * 100}%` }} />
              {/* The only measured point below the current share — drawn, never enforced. */}
              <span className="bg-foreground/40 absolute inset-y-0 w-px" style={{ left: "5.3%" }} />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums">{num(row.crops)}</span>
            <span className="w-14 shrink-0 text-right tabular-nums">{pct(row.share)}</span>
            {row.real ? <span className={MUTED}>Realpartie</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-sm tabular-nums">
        Realpartien gesamt: {num(shares.real)} Crops · {pct(shares.realShare)} des train-Splits
      </p>
      <ul className={`${MUTED} space-y-0.5`}>
        <li>gemessen: 5.3 % → 2 Phantome (specs/53 STATUS:85)</li>
        <li>gemessen: 50 % → 105 Phantome (TODO.md:203)</li>
        <li>dazwischen ist nichts gemessen.</li>
      </ul>
      <pre className="bg-muted overflow-x-auto rounded px-2 py-1 text-xs select-all">
        {`uv run chesslab dataset build ${nextVersion(name)} \\
  --sessions <aus dataset.yaml session_ids kopieren> \\
  --source-manifest data/manifests/squares.jsonl,data/manifests/capped-rg-<datum>.jsonl`}
      </pre>
      <p className={MUTED}>
        Es gibt keinen Code-Pfad, der eine Ergänzungs-Obergrenze erzwingt: <code>--source-manifest</code> (cli.py:725) nimmt
        einen von Hand reduzierten Pool, das ist die ganze Mechanik.
      </p>
    </section>
  );
}

function PackLines({ pack }: { pack: PackSummary }) {
  const decided = decidedRatio(pack);
  return (
    <div className="space-y-0.5 text-sm tabular-nums">
      <p>
        sampled {orDash(pack.sampled)} → accepted {orDash(pack.accepted.frames)} Frames / {orDash(pack.accepted.crops)} Crops
      </p>
      <p>
        quarantine {orDash(pack.quarantine?.frames)} Frames / {orDash(pack.quarantine?.crops)} Crops
        {pack.quarantine === null ? <span className={MUTED}> — altes Schema (clean_*), ohne Quarantäne-Spalte</span> : null}
      </p>
      <p>
        {decided
          ? `= ${pct(decided.ratio)} der entschiedenen Frames (${num(decided.quarantined)} von ${num(decided.decided)})`
          : "= — (ohne Quarantäne-Zahl ist kein Nenner entschiedener Frames zu bilden)"}
      </p>
      <p>
        occluded-Vorschläge {orDash(pack.occluded?.frames)} Frames / {orDash(pack.occluded?.crops)} Crops
      </p>
    </div>
  );
}

/** §7.3: `training-pack/` only, variants named and never summed; dirty per exported session. */
export function PacksBlock({ bundles, dirty }: { bundles: Bundle[]; dirty: SessionDirty[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Quarantäne & Dirty</h2>
      <p className={MUTED}>
        Gelesen wird ausschließlich <code>training-pack/</code> — der kanonische Name, den die Transfer-Kette schreibt.
        Geschwister-Packs sind dasselbe Video unter anderen Sampling-Einstellungen und werden benannt, nie addiert.
      </p>
      <ul className="space-y-2">
        {bundles.map((bundle) => (
          <li className={CARD} key={bundle.name}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-mono font-semibold">{bundle.name}</span>
              {bundle.pack ? <span className={MUTED}>Schema {bundle.pack.schema}_* · Modell {bundle.pack.model ?? "—"}</span> : null}
              {bundle.variants.length > 0 ? <Badge variant="secondary">+{bundle.variants.length} Varianten</Badge> : null}
            </div>
            {bundle.pack ? (
              <PackLines pack={bundle.pack} />
            ) : (
              <p className="text-sm">
                kein <code>training-pack/</code> — nur Varianten, und die werden hier nicht als Bundle gezählt
              </p>
            )}
            {bundle.variants.length > 0 ? <p className={`${MUTED} font-mono`}>{bundle.variants.join(" · ")}</p> : null}
          </li>
        ))}
      </ul>
      <h3 className="font-semibold">Dirty-Anteil der exportierten Sessions</h3>
      <ul className="space-y-0.5 text-sm">
        {dirty.map((session) => (
          <li className="flex flex-wrap gap-x-3 tabular-nums" key={session.sessionId}>
            <span className="w-56 font-mono">{session.sessionId}</span>
            <span>
              {num(session.dirty)} / {num(session.rows)} Frames dirty
            </span>
            <span>{session.rows ? pct(session.dirty / session.rows) : "—"}</span>
          </li>
        ))}
      </ul>
      <p className={MUTED}>
        Nenner ist die Zeilenzahl von <code>data/sessions/rg-&lt;n&gt;/log.jsonl</code> — exportierte Frames, keine
        gesampelten.
      </p>
    </section>
  );
}

/** §7.4: nothing on disk carries illumination, so this panel says that and nothing else. */
export function LightBlock() {
  return (
    <section className={CARD}>
      <h2 className="text-lg font-semibold">Licht</h2>
      <p className="text-sm">Lichtdomänen: keine Messung auf der Platte</p>
      <p className={MUTED}>
        <code>stats.json</code>s <code>light</code>/<code>dark</code> sind Feldfarbe (<code>labeling.square_color</code>), keine
        Helligkeit — sie hier als Lichtdomäne zu zeigen wäre eine Lüge.
      </p>
    </section>
  );
}

function RunRow({ run }: { run: PackGroup["runs"][number] }) {
  return (
    <li className="space-y-1">
      <div className="flex flex-wrap gap-x-3 text-sm tabular-nums">
        <span className="w-64 font-mono">{run.model}</span>
        <span>ph {orDash(run.phantoms)} · mi {orDash(run.misses)}</span>
        <span className={`${MUTED} font-mono`}>{run.file}</span>
      </div>
      <details className="text-xs">
        <summary className="text-muted-foreground max-sm:h-11 max-sm:leading-[2.75rem] cursor-pointer">
          crop_acc {run.cropAcc?.toFixed(3) ?? "—"} · occupied_piece_acc {run.occupiedPieceAcc?.toFixed(3) ?? "—"} · top
          confusions
        </summary>
        <ul className="mt-1 space-y-0.5">
          {run.confusions.slice(0, 8).map((confusion) => (
            <li className="flex flex-wrap items-center gap-x-2 tabular-nums" key={`${confusion.true}-${confusion.pred}`}>
              <span className="font-mono">
                {confusion.true}→{confusion.pred}
              </span>
              <span>{num(confusion.count)}</span>
              <button
                className="border-border text-muted-foreground max-sm:h-11 cursor-not-allowed rounded border px-2 py-0.5"
                disabled
                title="Der Labeln-Strom mit Lane-Filter existiert erst in Phase 3"
                type="button"
              >
                als Lane öffnen
              </button>
            </li>
          ))}
          {run.confusions.length === 0 ? <li className={MUTED}>keine <code>top_confusions</code> in dieser Datei</li> : null}
        </ul>
      </details>
    </li>
  );
}

/**
 * §7.5: what a model makes of this corpus — one line per FILE, labelled by that file's own fields.
 *
 * A model name and an eval result that were never in the same file must not meet on one line
 * (REVIEW.md S1), so a file without a `pack` is grouped as packless instead of guessed into a pack.
 */
export function VetoStrip({ groups, sweep }: { groups: PackGroup[]; sweep: { file: string; present: boolean } }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Was das Modell aus diesem Datensatz macht</h2>
      <p className={MUTED}>
        Das Veto-Maß ist <em>Misses bei null Phantomen</em> — eine Eigenschaft eines trainierten Modells über einen Pack, nie
        eine des Datensatzes. Phantome (ph) und Misses (mi) stehen unten je Datei.
      </p>
      <ul className="space-y-2">
        {groups.map((group) => (
          <li className={CARD} key={group.pack ?? "(ohne pack)"}>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-mono font-semibold">{group.pack ? `Pack ${group.pack}` : "ohne pack-Feld in der Datei"}</span>
              {agreed(group.runs, "crops") !== null && agreed(group.runs, "boards") !== null ? (
                <span className="text-sm tabular-nums">
                  ({num(agreed(group.runs, "crops") ?? 0)} Crops, {num(agreed(group.runs, "boards") ?? 0)} Bretter)
                </span>
              ) : (
                <span className={MUTED}>Läufe nennen unterschiedliche Crop-/Brett-Zahlen — je Zeile gelesen</span>
              )}
            </div>
            <ul className="space-y-2">
              {group.runs.map((run) => (
                <RunRow key={`${run.file}-${run.model}`} run={run} />
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <p className={MUTED}>
        <code>sweep_infer_size.py</code> schreibt ein Text-Log, kein JSON — die Zahl „Misses bei null Phantomen“ wird
        verlinkt, nie geparst: <code>{sweep.file}</code>{" "}
        {sweep.present ? "(liegt auf der Platte)" : "(liegt derzeit nicht auf der Platte)"}
      </p>
    </section>
  );
}
