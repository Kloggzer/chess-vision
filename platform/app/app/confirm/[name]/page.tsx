import Link from "next/link";
import { ChainActions } from "@/app/chain-actions";
import { chainState } from "@/lib/chain";
import { Badge } from "@/components/ui/badge";
import { listFrameStems, loadCandidate, truthSans } from "@/lib/data";
import { lcsReport } from "@/lib/lcs";
import { buildGalleryCards, buildReviewCards } from "@/lib/review-cards";
import { ConfirmReview } from "./cards";

/** The recording is here, the tracker's reading of it is not. */
async function NoCandidate({ name }: { name: string }) {
  const state = await chainState(name);
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{name}</h1>
      <p className="text-muted-foreground text-sm">
        No <code>candidate.json</code>: nothing has read this recording yet, so there are no plies to
        judge. {state.video ? "The replay below writes one — it decodes the whole video and takes minutes." : "This bundle carries no video, so there is nothing to read."}
      </p>
      <ChainActions name={name} state={state} />
      <Link className="text-muted-foreground text-sm underline underline-offset-4" href="/">
        ← all games
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
  const truth = await truthSans(name);
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
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-muted-foreground text-sm">
          <Badge className="mr-2" variant={candidate.source?.lens ? "default" : "destructive"}>
            {candidate.source?.lens ? "Barrel korrigiert" : "Barrel-Korrektur nicht belegt"}
          </Badge>
          {truth ? (
            <>
              {moves.length} Halbzüge im Kandidaten vs {truth.length} in reference.pgn — zugeordnet{" "}
              <strong className="text-foreground">{matched.length}</strong>, offen{" "}
              <strong className="text-foreground">{invented.length}</strong>, fehlend{" "}
              {missed.length} Halbzüge
            </>
          ) : (
            <>
              {moves.length} Halbzüge im Kandidaten · <strong className="text-foreground">no
              reference.pgn</strong> — nothing to compare against, so every ply is yours to judge.
              Drop a PGN at <code>data/realgames/{name}/reference.pgn</code> and reload to get the
              automatic comparison instead.
            </>
          )}
          {candidate.confirmed ? (
            <Badge className="ml-2" variant="secondary">
              already confirmed {candidate.confirmed_at}
            </Badge>
          ) : null}
        </p>
      </header>

      <ConfirmReview cards={cards} gallery={gallery} name={name} />

      <details className="border-border rounded-lg border p-4">
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
