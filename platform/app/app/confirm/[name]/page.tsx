import { Chess } from "chess.js";
import { Badge } from "@/components/ui/badge";
import { listFrameStems, loadCandidate, truthSans } from "@/lib/data";
import { lcsReport } from "@/lib/lcs";
import { UnmatchedCards } from "./cards";

/** From/to squares of a SAN, replayed from the TRACKER's own position chain (the ply may be
 *  illegal against the reference game, but it was legal against the tracker's board). */
function moveSquares(fenBefore: string | undefined, san: string): { from: string; to: string } | null {
  if (!fenBefore) return null;
  try {
    const chess = new Chess(fenBefore);
    const move = chess.move(san);
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: PageProps<"/confirm/[name]">) {
  const { name } = await params;
  const candidate = await loadCandidate(name);
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
  // card lets the human step through what exists instead of judging a covered board.
  const stems = await listFrameStems(name);
  const cards = invented.map((index) => {
    const move = moves[index];
    const fenBefore = index === 0 ? candidate.start_fen : moves[index - 1].fen_after;
    const until = moves[index + 1]?.frame ?? move.frame + 90;
    const window = stems.filter((s) => {
      const n = Number(s.stem);
      return n >= move.frame - 2 && n < Math.max(until, move.frame + 3);
    });
    // Start on the stem nearest the commit — the old single-frame behaviour, now a position.
    const start = window.reduce(
      (best, s, i) =>
        Math.abs(Number(s.stem) - move.frame) < Math.abs(Number(window[best].stem) - move.frame)
          ? i
          : best,
      0,
    );
    return {
      index,
      ply: move.ply,
      san: move.san,
      frame: move.frame,
      stems: window,
      start,
      duplicate: missedSans.has(move.san),
      squares: moveSquares(fenBefore, move.san),
    };
  });

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-muted-foreground text-sm">
          {truth ? (
            <>
              {moves.length} candidate plies vs {truth.length} in reference.pgn — matched{" "}
              <strong className="text-foreground">{matched.length}</strong>, unmatched{" "}
              <strong className="text-foreground">{invented.length}</strong>, missed {missed.length}
            </>
          ) : (
            <>
              {moves.length} candidate plies · <strong className="text-foreground">no
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

      <UnmatchedCards name={name} cards={cards} />

      <details className="border-border rounded-lg border p-4">
        <summary className="cursor-pointer text-sm font-medium">
          missed — reference only ({missed.length})
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
