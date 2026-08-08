import { Badge } from "@/components/ui/badge";
import { loadCandidate, reviewFrame, truthSans } from "@/lib/data";
import { lcsReport } from "@/lib/lcs";
import { UnmatchedCards } from "./cards";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ params }: PageProps<"/confirm/[name]">) {
  const { name } = await params;
  const candidate = await loadCandidate(name);
  const truth = await truthSans(name);
  const moves = candidate.moves;
  const { matched, invented, missed } = lcsReport(truth, moves.map((m) => m.san));
  const missedSans = new Set(missed.map((i) => truth[i]));

  const cards = await Promise.all(
    invented.map(async (index) => {
      const move = moves[index];
      return {
        index,
        ply: move.ply,
        san: move.san,
        frame: move.frame,
        stem: await reviewFrame(name, move.frame),
        duplicate: missedSans.has(move.san),
      };
    }),
  );

  return (
    <main className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{name}</h1>
        <p className="text-muted-foreground text-sm">
          {moves.length} candidate plies vs {truth.length} in reference.pgn — matched{" "}
          <strong className="text-foreground">{matched.length}</strong>, unmatched{" "}
          <strong className="text-foreground">{invented.length}</strong>, missed {missed.length}
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
              {i + 1} {truth[i]}
            </li>
          ))}
        </ul>
      </details>
    </main>
  );
}
