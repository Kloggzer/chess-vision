import Link from "next/link";
import { ChainActions } from "@/app/chain-actions";
import { PageTitle } from "@/app/page-title";
import { chainState, referenceOrigin } from "@/lib/chain";
import { Badge } from "@/components/ui/badge";
import { ReferenceChip } from "@/components/reference-chip";
import { listFrameStems, loadCandidate, readReference } from "@/lib/data";
import { lcsReport } from "@/lib/lcs";
import { buildGalleryCards, buildReviewCards } from "@/lib/review-cards";
import { ConfirmReview } from "./cards";

async function NoCandidate({ name }: { name: string }) {
  const state = await chainState(name);
  return (
    <main className="space-y-4">
      <PageTitle title={name} />
      <p className="text-muted-foreground text-sm">
        Keine <code>candidate.json</code> —{" "}
        {state.video
          ? "der Replay unten schreibt eine; er dekodiert das ganze Video und dauert Minuten."
          : "dieses Bundle trägt kein Video, es gibt nichts zu lesen."}
      </p>
      <ChainActions name={name} state={state} />
      <Link className="text-muted-foreground hover:text-foreground text-sm" href="/">
        ← Partien
      </Link>
    </main>
  );
}

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: PageProps<"/confirm/[name]">) {
  const { name } = await params;
  // A transferred recording has no candidate until the tracker has read it — 29 of them arrived
  // over the LAN on 2026-08-13 and every one of their `confirm` links was a runtime error. There
  // is nothing to confirm yet, and the page that says so is also the page that offers the step.
  const candidate = await loadCandidate(name).catch(() => null);
  if (!candidate) return <NoCandidate name={name} />;
  const [reference, origin] = await Promise.all([readReference(name), referenceOrigin(name)]);
  const truth = reference?.sans ?? null;
  const moves = candidate.moves;
  // Without a `reference.pgn` there is nothing to match against, so EVERY ply is the human's to
  // judge — the same review, minus the machine narrowing it down first.
  const { matched, invented, missed } = truth
    ? lcsReport(truth, moves.map((m) => m.san))
    : { matched: [] as [number, number][], invented: moves.map((_, i) => i), missed: [] };
  const missedSans = new Set(missed.map((i) => truth?.[i] ?? ""));

  // Every stem on disk once, then per card the window [commit-2, next commit) — the frames that
  // can show the position AFTER this ply. A commit can anchor mid-hand (a verify or pair commit,
  // or a blitz reply already arriving), so ONE picture is sometimes a hand and nothing else; the
  // card lets the human step through what exists instead of judging a covered board. Plies that
  // share a commit frame share that window, so they share ONE card (`lib/review-cards.ts`).
  const stems = await listFrameStems(name);
  const cards = buildReviewCards({
    moves,
    indices: invented,
    stems,
    startFen: candidate.start_fen,
    missedSans,
  });
  // The matched plies get the same windows without a verdict: a clean LCS says nothing about
  // hands, crops or dark frames, and a game that matches perfectly showed the human NOTHING.
  const gallery = buildGalleryCards({ moves, matched, stems, startFen: candidate.start_fen });

  return (
    <main className="space-y-4">
      <PageTitle title={name}>
        <ReferenceChip origin={origin} />
        {candidate.source?.lens ? null : (
          <Badge variant="destructive" title="candidate.json belegt keine Linsen-Korrektur">
            Barrel nicht korrigiert
          </Badge>
        )}
        {candidate.confirmed ? (
          <span className="text-muted-foreground">bereits bestätigt {candidate.confirmed_at}</span>
        ) : null}
      </PageTitle>
      <p className="text-muted-foreground text-xs tabular-nums">
        {truth ? (
          <>
            {moves.length} Halbzüge · <span className="text-foreground">{matched.length}</span> zugeordnet ·{" "}
            <span className="text-foreground">{invented.length}</span> offen · {missed.length} fehlend
          </>
        ) : (
          <span title={`ohne data/recordings/${name}/reference.pgn gibt es nichts zu vergleichen — jeder Halbzug ist deiner`}>
            {moves.length} Halbzüge · {reference ? "reference.pgn unlesbar" : "keine reference.pgn"}
          </span>
        )}
        {reference?.problem ? <span className="text-destructive"> · {reference.problem}</span> : null}
        {reference && reference.more > 0 ? (
          <span title="das Handy schreibt nach jeder Naht (Resync) eine Fortsetzung als eigene Partie; der Kandidat deckt nur das erste Segment">
            {" "}· {reference.more} Fortsetzung{reference.more > 1 ? "en" : ""} in der Datei, nicht verglichen
          </span>
        ) : null}
      </p>

      <ConfirmReview cards={cards} gallery={gallery} name={name} />

      <details className="border-border rounded-lg border px-3 py-2">
        {/* Ohne reference.pgn ist „0 fehlend" eine Behauptung über einen Vergleich, den niemand
            angestellt hat — dann steht „—" (CONCEPT.md 4.2). */}
        <summary
          className="cursor-pointer text-sm font-medium"
          title={truth ? undefined : "keine reference.pgn — es gibt nichts, wogegen fehlende Halbzüge zählen könnten"}
        >
          missed — reference only ({truth ? `${missed.length} Halbzüge` : "—"})
        </summary>
        <ul className="text-muted-foreground mt-3 grid grid-cols-4 gap-x-4 gap-y-1 font-mono text-xs sm:grid-cols-6">
          {missed.map((i) => (
            <li key={i}>
              {i + 1} {truth?.[i]}
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
