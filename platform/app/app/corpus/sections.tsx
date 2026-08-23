import { Hint, Why } from "@/app/page-title";
import { Badge } from "@/components/ui/badge";
import { BarRows, Legend, Meter, PairBars, Tile, type Bar, type Tone } from "@/components/chart";
import { maxOf, niceMax } from "@/lib/chart";
import { LEGACY_LABEL, PIECE_VISIBLE_MAX } from "@/lib/classes";
import type { ClassScheme, CorpusIndex, Shares, Split } from "@/lib/corpus";
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
const SUMMARY = "cursor-pointer max-sm:min-h-11";

export type DatasetView = {
  name: string;
  split: Split;
  /** What this snapshot's labels mean — read off the snapshot, never assumed (`lib/corpus.ts`). */
  scheme: ClassScheme;
  index: CorpusIndex;
  shares: Shares;
  /** `null` where the snapshot carries no `occluded` bucket to compare the pool against. */
  fit: OccludedFit | null;
  /** False for turntable, synth and phone packs: their train split holds no recorded game. */
  hasReal: boolean;
};

/**
 * Occlusion under `pieces13`: a per-row float, not a class. `null` = no row carried the field,
 * which is "not measured" and must never be drawn as a zero.
 */
function coverageOf(view: DatasetView | null) {
  const cov = view?.index.coverage ?? null;
  if (!cov || cov.rows === 0) return null;
  return { ...cov, share: cov.over / cov.rows };
}

const COVERAGE_WHY =
  `Verdeckung ist im 13er-Schema eine Zahl je Zeile, keine Klasse. Über ${PIECE_VISIBLE_MAX} ist ein Crop ` +
  `kein Figur-Beispiel mehr — OcclusionLoss nimmt ihn aus dem Klassen-Term, die Zeile bleibt im Datensatz.`;

/** A line that is cut to its column; the whole of it belongs in the tooltip, not in the layout. */
function Note({ why, className, children }: { why: string; className?: string; children: React.ReactNode }) {
  return (
    <p className={className}>
      <Hint tip={why}>{children}</Hint>
    </p>
  );
}

const poolWhy = (pool: Pool) =>
  `POOL = jede Zelle jedes exportierten Log-Frames (64 je Frame, ${num(pool.frames)} Frames, ${num(pool.cells)} Zellen), ` +
  `FEN-Label mit corrections.jsonl last-wins auf (session_id, frame, square). Ein Slice schneidet aus einer Zelle einen ` +
  `Crop; ${num(pool.orphans)} Korrekturzeilen liegen auf keinem exportierten Frame.`;

function OccludedTile({ pool, view }: { pool: Pool; view: DatasetView | null }) {
  const snapshot = view?.split.train_class_counts?.[LEGACY_LABEL] ?? 0;
  const diff = occludedDiff(pool.classes[LEGACY_LABEL] ?? 0, snapshot);
  return (
    <Tile
      label="DIFF occluded (Rebuild heute)"
      sub={view?.hasReal ? `POOL ${num(pool.classes[LEGACY_LABEL] ?? 0)} ▸ SNAPSHOT ${num(snapshot)}` : "keine Realpartie im train-Split"}
      value={view?.hasReal ? `${diff > 0 ? "−" : diff < 0 ? "+" : ""}${num(Math.abs(diff))} Zellen` : "—"}
      why="Positiv = der Pool ist dem Snapshot voraus; das ist, was ein Rebuild heute hinzufügen würde."
    />
  );
}

function CoverageTile({ view }: { view: DatasetView | null }) {
  const cov = coverageOf(view);
  return (
    <Tile
      label={`Zeilen über coverage ${PIECE_VISIBLE_MAX}`}
      sub={cov ? `${num(cov.over)} von ${num(cov.rows)} Zeilen mit coverage` : "keine Zeile trägt ein coverage-Feld"}
      value={cov ? pct(cov.share) : "—"}
      why={COVERAGE_WHY}
    />
  );
}

export function Tiles({ pool, view, provenance }: { pool: Pool; view: DatasetView | null; provenance: ProvenanceSummary }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        label="POOL"
        sub={`${num(pool.frames)} Frames · ${num(pool.orphans)} verwaiste Korrekturen`}
        value={`${num(pool.cells)} Zellen`}
        why={poolWhy(pool)}
      />
      {view === null || view.scheme === "pieces14" ? <OccludedTile pool={pool} view={view} /> : <CoverageTile view={view} />}
      <Tile
        label="Realpartien im train-Split"
        sub={view ? `${num(view.shares.real)} von ${num(view.shares.total)} Crops` : "kein Datensatz gewählt"}
        value={view ? pct(view.shares.realShare) : "—"}
        why="gemessen 2026-08-10: 5,3 % → 2 Phantome, 50 % → 105. Dazwischen ist nichts gemessen."
      />
      <Tile
        label="Modell-Lesarten (D2)"
        sub={`${num(provenance.rows)} Zellen · ${provenance.models.join(", ") || "kein Modell benannt"}`}
        value={`${provenance.read}/${provenance.sessions} Sessions`}
        why="Ohne model-reads.jsonl sind die Lanes „Modell ≠ FEN“ auf dieser Session leer — nicht gemessen, nicht null. Ein korpusweiter Lauf wartet auf ein nachtrainiertes Modell."
      />
    </div>
  );
}

/** D2 per session: which run read it and when, or `—` for the ones no model has read yet. */
export function D2Banner({ entries, summary }: { entries: Provenance[]; summary: ProvenanceSummary }) {
  return (
    <details className={CARD}>
      <summary className={`${SUMMARY} text-sm`}>
        <span className="font-semibold">Herkunft der Modell-Lesarten (D2)</span>
        <span className="text-muted-foreground ml-3 tabular-nums">
          {summary.read}/{summary.sessions} Sessions gelesen · {num(summary.probRows)} Zeilen mit <code>probs</code>
          {summary.withoutModel > 0 ? ` · ${summary.withoutModel} ohne Modellangabe` : ""}
        </span>
      </summary>
      <ul className="mt-2 space-y-0.5 font-mono text-xs">
        {entries.map((entry) => (
          <li className="flex flex-wrap gap-x-3" key={entry.name}>
            <span className="min-w-56">{entry.name}</span>
            <span className="tabular-nums">{orDash(entry.rows)} Zellen</span>
            <span className="tabular-nums">probs {orDash(entry.probs)}</span>
            <span>model {entry.model ?? "—"}</span>
            <span className={MUTED}>{entry.rows === null ? "nicht gemessen" : (entry.writtenAt ?? "ohne Datum")}</span>
          </li>
        ))}
      </ul>
      {entries.length === 0 ? <p className={MUTED}>Keine Sessions unter <code>data/recordings/</code>.</p> : null}
    </details>
  );
}

const classTone = (klass: string): Tone => (klass === LEGACY_LABEL ? "subject" : klass === "empty" ? "second" : "context");

const CLASS_LEGEND: { tone: Tone; label: string }[] = [
  { tone: "subject", label: LEGACY_LABEL },
  { tone: "second", label: "empty" },
  { tone: "context", label: "Figuren" },
];

/** §7.1: every figure verbatim from `split.json` — the chart sorts, the table keeps the class order. */
export function BalanceCard({ view, pool }: { view: DatasetView; pool: Pool }) {
  const { split } = view;
  const train = split.counts?.train ?? 0;
  const classes = split.classes ?? [];
  const counts = (klass: string) => split.train_class_counts?.[klass] ?? 0;
  const max = niceMax(maxOf(classes.map(counts)));
  const bars: Bar[] = [...classes]
    .sort((a, b) => counts(b) - counts(a))
    .map((klass) => ({
      key: klass,
      label: klass,
      value: counts(klass),
      text: num(counts(klass)),
      tone: classTone(klass),
      why: `${klass}: ${num(counts(klass))} Crops · ${train ? pct(counts(klass) / train) : "—"} des train-Splits`,
    }));

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-sm font-semibold">Klassenbalance</h3>
        <span className={`${MUTED} tabular-nums`}>train-Crops je Klasse · Achse bis {num(max)}</span>
        <Why>
          {`train ${num(train)} · val ${num(split.counts?.val ?? 0)} · test ${num(split.counts?.test ?? 0)} Crops, verbatim aus split.json. manifest.jsonl: ${num(view.index.rows)} Zeilen. Gebaut heißt Snapshot der Bauzeit, nicht der Zustand von heute.`}
        </Why>
      </div>
      <Legend items={CLASS_LEGEND.filter((item) => item.tone === "context" || classes.includes(item.label))} />
      <BarRows bars={bars} labelClass="max-w-20" max={max} />
      {(split.warnings ?? []).length > 0 ? (
        <ul className="text-destructive text-xs">
          {split.warnings.map((warning) => (
            <li key={warning}>⚠ {warning}</li>
          ))}
        </ul>
      ) : null}
      <details className={MUTED}>
        <summary className={SUMMARY}>Zahlen: Anteil, class_weight{view.hasReal ? ", POOL" : ""}</summary>
        <div className="mt-1 overflow-x-auto">
          <table className="w-full tabular-nums">
            <thead>
              <tr className="text-left">
                <th className="pr-3 font-normal">Klasse</th>
                <th className="pr-3 text-right font-normal">train (Crops)</th>
                <th className="pr-3 text-right font-normal">Anteil</th>
                <th className="pr-3 text-right font-normal">class_weight</th>
                {view.hasReal ? <th className="text-right font-normal">POOL (Zellen)</th> : null}
              </tr>
            </thead>
            <tbody className="text-foreground">
              {classes.map((klass) => (
                <tr key={klass}>
                  <td className="pr-3 font-mono">{klass}</td>
                  <td className="pr-3 text-right">{num(counts(klass))}</td>
                  <td className="pr-3 text-right">{train ? pct(counts(klass) / train) : "—"}</td>
                  <td className="pr-3 text-right">{split.class_weights?.[klass] ?? "—"}</td>
                  {view.hasReal ? <td className="text-right">{num(pool.classes[klass] ?? 0)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

/**
 * §7.1's second half, in the scheme the snapshot was BUILT in: `pieces14` compares its occluded
 * bucket against the pool, `pieces13` has no such bucket and reports its coverage instead. Old
 * snapshots keep reading exactly as before — the page branches, it does not convert.
 */
export function PoolCard({ view, pool }: { view: DatasetView; pool: Pool }) {
  return view.scheme === "pieces14" && view.fit ? (
    <OccludedPool fit={view.fit} pool={pool} view={view} />
  ) : (
    <CoveragePool pool={pool} view={view} />
  );
}

function CoveragePool({ view, pool }: { view: DatasetView; pool: Pool }) {
  const cov = coverageOf(view);
  const legacy = pool.classes[LEGACY_LABEL] ?? 0;
  const max = niceMax(cov?.rows ?? 0);

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-sm font-semibold">
          Verdeckung: coverage statt Klasse
          <span className={`${MUTED} ml-2 font-mono`}>{view.scheme}</span>
        </h3>
        <Why>{COVERAGE_WHY}</Why>
      </div>
      {cov ? (
        <>
          <BarRows
            bars={[
              {
                key: "over",
                label: `> ${PIECE_VISIBLE_MAX}`,
                value: cov.over,
                text: `${num(cov.over)} Zeilen`,
                tone: "subject",
                why: `verdeckt: kein Figur-Beispiel, aber weiter Trainingssignal für den coverage-Ausgang`,
              },
              {
                key: "under",
                label: `≤ ${PIECE_VISIBLE_MAX}`,
                value: cov.rows - cov.over,
                text: `${num(cov.rows - cov.over)} Zeilen`,
                tone: "deep",
                why: "sichtbar genug: zählt voll in den Klassen-Term",
              },
            ]}
            labelClass="max-w-24"
            max={max}
          />
          <p className="text-2xl leading-tight font-semibold tabular-nums">
            {pct(cov.share)}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              der {num(cov.rows)} Zeilen mit coverage liegen über {PIECE_VISIBLE_MAX}
            </span>
          </p>
        </>
      ) : (
        <Note
          className={MUTED}
          why="manifest.jsonl trägt das Feld erst, wenn die Session eine matte.jsonl hat (labeling.slice_session)."
        >
          Keine Zeile dieses Manifests trägt <code>coverage</code> — nicht gemessen, nicht null.
        </Note>
      )}
      {legacy > 0 ? (
        <Note
          className={`${MUTED} truncate`}
          why="Die Zeilen bleiben lesbar und werden nie umgeschrieben; in diesem Schema tragen sie nur keinen Crop mehr."
        >
          POOL hält {num(legacy)} Alt-Zellen <code>{LEGACY_LABEL}</code> — in diesem Schema wird daraus kein Crop.
        </Note>
      ) : null}
    </section>
  );
}

function OccludedPool({ view, pool, fit }: { view: DatasetView; pool: Pool; fit: OccludedFit }) {
  const snapshot = view.split.train_class_counts?.[LEGACY_LABEL] ?? 0;
  const poolOccluded = pool.classes[LEGACY_LABEL] ?? 0;
  const diff = occludedDiff(poolOccluded, snapshot);
  const max = niceMax(Math.max(poolOccluded, snapshot));

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-sm font-semibold">occluded: POOL gegen SNAPSHOT</h3>
        <span className={`${MUTED} tabular-nums`}>Achse bis {num(max)}</span>
        <Why>
          Eine Session steht als „drin“, wenn ihre occluded-Labels im Snapshot liegen — entschieden an der occluded-Zahl,
          nie an der Session-Liste, weil nur die occ-Slices occluded-Crops tragen.
        </Why>
      </div>
      {view.hasReal ? (
        <>
          <BarRows
            bars={[
              { key: "pool", label: "POOL", value: poolOccluded, text: `${num(poolOccluded)} Zellen`, tone: "subject", why: poolWhy(pool) },
              {
                key: "snapshot",
                label: "SNAPSHOT",
                value: snapshot,
                text: `${num(snapshot)} Crops`,
                tone: "deep",
                why: "gebaut: ein Snapshot der Bauzeit, nicht der Zustand von heute",
              },
            ]}
            labelClass="max-w-24"
            max={max}
          />
          <p className="text-2xl leading-tight font-semibold tabular-nums">
            {diff > 0 ? "−" : diff < 0 ? "+" : ""}
            {num(Math.abs(diff))}{" "}
            <span className="text-muted-foreground text-xs font-normal">
              {diff > 0 ? "Zellen fehlen dem Snapshot" : diff < 0 ? "Zellen mehr im Snapshot als im Pool" : "gleichauf"}
            </span>
          </p>
          <Note className={`${MUTED} truncate`} why={fit.inside.map((hit) => hit.datasetSessionId).join(" · ") || "—"}>
            drin:{" "}
            {fit.inside.length === 0
              ? "—"
              : fit.inside.map((hit) => `${hit.datasetSessionId} (${num(hit.crops)})`).join(" · ")}
          </Note>
          <Note className={`${MUTED} truncate`} why={fit.outside.join(" · ") || "—"}>
            NICHT drin: {fit.outside.length === 0 ? "—" : fit.outside.join(" · ")}
          </Note>
        </>
      ) : (
        <p className={MUTED}>keine Realpartie-Session im train-Split — POOL/DIFF ist hier nicht anwendbar.</p>
      )}
    </section>
  );
}

/** `real14-all-80-v1` → `real14-all-80-v2`; the command must name a NEW dataset, never rebuild one. */
function nextVersion(name: string): string {
  const match = /-v(\d+)$/.exec(name);
  return match ? `${name.slice(0, -match[0].length)}-v${Number(match[1]) + 1}` : `${name}-v2`;
}

const MARKS = [
  { at: 0.053, label: "5,3 %", why: "gemessen 2026-08-10: 5,3 % Realpartien-Anteil → 2 Phantome" },
  { at: 0.5, label: "50 %", why: "gemessen: 50 % → 105 Phantome (TODO.md:203). Dazwischen ist nichts gemessen." },
];

/** §7.2: the share each session holds, plus the two points anyone ever measured — those sit on the
 *  meter of the REAL share, the quantity they measured; a rule across the bars would read as a cap. */
export function SharesBlock({ view }: { view: DatasetView }) {
  const { shares, name } = view;
  const max = niceMax(maxOf(shares.rows.map((row) => row.share)));
  const bars: Bar[] = shares.rows.map((row) => ({
    key: row.sessionId,
    label: row.sessionId,
    value: row.share,
    text: pct(row.share),
    tone: row.real ? "subject" : "context",
    why: `${row.sessionId}: ${num(row.crops)} Crops · ${pct(row.share)} des train-Splits${row.real ? " · Realpartie" : ""}`,
  }));

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="text-sm font-semibold">Anteil je Session</h3>
        <span className={`${MUTED} tabular-nums`}>{num(shares.total)} Crops im train-Split · Achse bis {pct(max, 0)}</span>
        <Why>
          Sessions des train-Splits, gezählt aus manifest.jsonl nach session_id, mtime-gekeyt über
          inbox/corpus-index/&lt;dataset&gt;.json. Grundsatz: Ergänzung, nie die Masse (TODO.md:203).
        </Why>
      </div>
      <Legend items={[{ tone: "subject", label: "Realpartie" }, { tone: "context", label: "Turntable, Synth, Phone" }]} />
      <BarRows bars={bars} max={max} />
      <Meter
        label="Realpartien gesamt"
        marks={MARKS}
        max={1}
        text={`${pct(shares.realShare)} · ${num(shares.real)} Crops`}
        value={shares.realShare}
        why="Skala 0–100 %. Die beiden Marken sind Messpunkte, keine Grenzwerte: 5,3 % → 2 Phantome, 50 % → 105 Phantome."
      />
      <details className={MUTED}>
        <summary className={SUMMARY}>Nachfolge-Datensatz bauen</summary>
        <pre className="bg-muted mt-1 overflow-x-auto rounded px-2 py-1 select-all">
          {`uv run chesslab dataset build ${nextVersion(name)} \\
  --sessions <aus dataset.yaml session_ids kopieren> \\
  --source-manifest data/crops/<tag>/manifest.jsonl,data/crops/capped-rg-<datum>/manifest.jsonl`}
        </pre>
        <p className="mt-1">
          Kein Code-Pfad erzwingt eine Ergänzungs-Obergrenze: <code>--source-manifest</code> (cli.py:725) nimmt einen von
          Hand reduzierten Pool, das ist die ganze Mechanik.
        </p>
      </details>
    </section>
  );
}

function PackLines({ pack }: { pack: PackSummary }) {
  const decided = decidedRatio(pack);
  return (
    <div className="mt-1 space-y-0.5 tabular-nums">
      <p>
        sampled {orDash(pack.sampled)} → accepted {orDash(pack.accepted.frames)} Frames / {orDash(pack.accepted.crops)} Crops
      </p>
      <p>
        quarantine {orDash(pack.quarantine?.frames)} Frames / {orDash(pack.quarantine?.crops)} Crops
        {pack.quarantine === null ? " — altes Schema (clean_*), ohne Quarantäne-Spalte" : ""}
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

function quarantineLine(pack: PackSummary): string {
  const decided = decidedRatio(pack);
  return decided
    ? `${pct(decided.ratio)} Quarantäne · ${orDash(pack.accepted.frames)} Frames angenommen`
    : `Quarantäne — · ${orDash(pack.accepted.frames)} Frames angenommen`;
}

/** §7.3: `training-pack/` only, variants named and never summed; dirty per exported session. */
export function PacksBlock({ bundles, dirty }: { bundles: Bundle[]; dirty: SessionDirty[] }) {
  const bars: Bar[] = dirty.map((session) => ({
    key: session.sessionId,
    label: session.sessionId,
    value: session.rows ? session.dirty / session.rows : 0,
    text: session.rows ? pct(session.dirty / session.rows) : "—",
    tone: "subject",
    why: `${session.sessionId}: ${num(session.dirty)} von ${num(session.rows)} exportierten Frames dirty`,
  }));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-sm font-semibold">Quarantäne je Pack</h3>
          <Why>
            Gelesen wird ausschließlich training-pack/ — der kanonische Name, den die Transfer-Kette schreibt.
            Geschwister-Packs sind dasselbe Video unter anderen Sampling-Einstellungen und werden benannt, nie addiert.
          </Why>
        </div>
        <ul className="space-y-1 text-xs">
          {bundles.map((bundle) => (
            <li key={bundle.name}>
              <details>
                <summary className={SUMMARY}>
                  <span className="font-mono">{bundle.name}</span>
                  <span className="text-muted-foreground ml-2 tabular-nums">
                    {bundle.pack ? quarantineLine(bundle.pack) : "kein training-pack/ — nur Varianten"}
                  </span>
                  {bundle.variants.length > 0 ? (
                    <Badge className="ml-2" variant="secondary">
                      +{bundle.variants.length}
                    </Badge>
                  ) : null}
                </summary>
                <div className={MUTED}>
                  {bundle.pack ? <PackLines pack={bundle.pack} /> : null}
                  {bundle.variants.length > 0 ? <p className="mt-1 font-mono">{bundle.variants.join(" · ")}</p> : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h3 className="text-sm font-semibold">Dirty-Anteil je exportierter Session</h3>
          <span className={MUTED}>Achse 0–100 % der Frames</span>
          <Why>
            Nenner ist die Zeilenzahl von data/recordings/&lt;n&gt;/log.jsonl — exportierte Frames, keine gesampelten.
          </Why>
        </div>
        <BarRows bars={bars} max={1} />
      </section>
    </div>
  );
}

/** §7.4: nothing on disk carries illumination, so this panel says that and nothing else. */
export function LightBlock() {
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-sm">
      Licht: keine Messung auf der Platte
      <Why>
        stats.jsons light/dark sind Feldfarbe (labeling.square_color), keine Helligkeit — sie hier als Lichtdomäne zu
        zeigen wäre eine Lüge.
      </Why>
    </p>
  );
}

function RunTable({ runs }: { runs: PackGroup["runs"] }) {
  return (
    <ul className="mt-1 space-y-1 text-xs">
      {runs.map((run) => (
        <li key={`${run.file}-${run.model}`}>
          <div className="flex flex-wrap gap-x-3 tabular-nums">
            <span className="w-64 font-mono">{run.model}</span>
            <span>ph {orDash(run.phantoms)} · mi {orDash(run.misses)}</span>
            <span>crop_acc {run.cropAcc?.toFixed(3) ?? "—"}</span>
            <span>occupied_piece_acc {run.occupiedPieceAcc?.toFixed(3) ?? "—"}</span>
            <span className={`${MUTED} font-mono`}>{run.file}</span>
          </div>
          <ul className="mt-0.5 ml-3 space-y-0.5">
            {run.confusions.slice(0, 8).map((confusion) => (
              <li className="flex flex-wrap items-center gap-x-2 tabular-nums" key={`${confusion.true}-${confusion.pred}`}>
                <span className="font-mono">
                  {confusion.true}→{confusion.pred}
                </span>
                <span>{num(confusion.count)}</span>
                <Hint tip={`Öffnet die Klassenwand-Lane für ${confusion.true}→${confusion.pred} — kommt mit der Lane-Verdrahtung`}>
                  <button
                    className="border-border text-muted-foreground max-sm:h-11 cursor-not-allowed rounded border px-2 py-0.5"
                    disabled
                    type="button"
                  >
                    als Lane öffnen
                  </button>
                </Hint>
              </li>
            ))}
            {run.confusions.length === 0 ? <li className={MUTED}>keine <code>top_confusions</code> in dieser Datei</li> : null}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/** §7.5: one pair of bars per FILE, from that file's own fields — a model name and a result that
 *  were never in the same file must not meet on one line, so packless files stay their own group. */
export function VetoStrip({ groups, sweep }: { groups: PackGroup[]; sweep: { file: string; present: boolean } }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="text-base font-semibold">Was das Modell aus diesem Datensatz macht</h2>
        <Why>
          Das Veto-Maß ist Misses bei null Phantomen — eine Eigenschaft eines trainierten Modells über einen Pack, nie eine
          des Datensatzes. Phantome (ph) und Misses (mi) stehen je Datei.
        </Why>
        <Legend items={[{ tone: "veto", label: "Phantome (das Veto)" }, { tone: "context", label: "Misses" }]} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((group) => {
          const max = niceMax(maxOf(group.runs.flatMap((run) => [run.phantoms, run.misses])));
          return (
            <section className={CARD} key={group.pack ?? "(ohne pack)"}>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-sm font-semibold">{group.pack ? group.pack : "ohne pack-Feld in der Datei"}</span>
                {agreed(group.runs, "crops") !== null && agreed(group.runs, "boards") !== null ? (
                  <span className={`${MUTED} tabular-nums`}>
                    {num(agreed(group.runs, "crops") ?? 0)} Crops · {num(agreed(group.runs, "boards") ?? 0)} Bretter · Achse bis{" "}
                    {num(max)}
                  </span>
                ) : (
                  <span className={MUTED}>Läufe nennen unterschiedliche Crop-/Brett-Zahlen — je Zeile gelesen</span>
                )}
              </div>
              <PairBars
                max={max}
                pairs={group.runs.map((run) => ({
                  key: `${run.file}-${run.model}`,
                  label: run.model,
                  why: `${run.model} · ${run.file}: ${orDash(run.phantoms)} Phantome, ${orDash(run.misses)} Misses`,
                  top: { key: "ph", label: "Phantome", value: run.phantoms ?? 0, text: `ph ${orDash(run.phantoms)}`, tone: "veto" },
                  bottom: { key: "mi", label: "Misses", value: run.misses ?? 0, text: `mi ${orDash(run.misses)}`, tone: "context" },
                }))}
              />
              <details className={MUTED}>
                <summary className={SUMMARY}>Zahlen je Datei &amp; Verwechslungen</summary>
                <RunTable runs={group.runs} />
              </details>
            </section>
          );
        })}
      </div>
      <Note
        className={`${MUTED} truncate`}
        why="sweep_infer_size.py schreibt ein Text-Log, kein JSON — die Zahl „Misses bei null Phantomen“ wird verlinkt, nie geparst."
      >
        <code>{sweep.file}</code> {sweep.present ? "liegt auf der Platte" : "liegt derzeit nicht auf der Platte"}
      </Note>
    </section>
  );
}
