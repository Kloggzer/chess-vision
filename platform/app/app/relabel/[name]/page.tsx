import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { judgedKeys } from "@/lib/corrections";
import { listGames } from "@/lib/data";
import { loadMeta } from "@/lib/meta";
import { classesSeen, framesMatching, loadProposals, proposalKey, splitStreams } from "@/lib/proposals";
import { boardProgress, loadProposalSummary } from "@/lib/proposal-summaries";
import { DEFAULT_CLASS, DEFAULT_MIN } from "./filter";
import { loadSession, sessionId } from "@/lib/session";
import { Streams } from "./streams";

/** The next session with undecided proposals, or null — the done banner's forward link. */
async function nextOpenSession(current: string): Promise<string | null> {
  for (const other of await listGames()) {
    if (other === current) continue;
    // An archived game asks for no work — the forward link must not resurrect it.
    if ((await loadMeta(other)).archived) continue;
    try {
      const { rows } = await loadProposals(other);
      if (rows.length === 0) continue;
      const done = await judgedKeys(sessionId(other));
      if (rows.some((r) => !done.has(proposalKey(r)))) return other;
    } catch {
      /* no proposals for this one */
    }
  }
  return null;
}

export const dynamic = "force-dynamic";

export default async function RelabelPage({ params }: PageProps<"/relabel/[name]">) {
  const { name } = await params;
  const { rows, thresholds, source } = await loadProposals(name);
  const session = await loadSession(name);
  // Both ledgers: a cell the human confirmed as "the FEN is right" must not be asked again
  // either, even though it wrote no training row.
  const decided = await judgedKeys(sessionId(name));
  const streams = splitStreams(rows, thresholds);

  const stems = [...new Set(rows.map((r) => r.frame))].sort();
  const frames = stems.map((stem) => {
    const row = session.byStem.get(stem);
    return {
      stem,
      ply: row?.ply ?? 0,
      fen: row?.fen ?? "8/8/8/8/8/8/8/8 w - - 0 1",
      phase: row?.phase,
      sinceS: row?.sinceS,
      toS: row?.toS,
      unknown: row?.unknown,
    };
  });
  const done = rows.filter((r) => decided.has(proposalKey(r))).length;
  // Bretter sind die Einheit, die ein Mensch abarbeitet; die Zellen stehen daneben (CONCEPT.md 6.2).
  // Diese Seite liest die Zeilen ohnehin für die Arbeit selbst, also zählen SIE — der Sidecar sagt
  // hier nur noch, woher die Zellenzahl kam.
  const summary = await loadProposalSummary(name);
  const seen = boardProgress(rows.map((r) => r.frame), decided.keys());
  const boards = seen.boards;

  // Hand-painting queue: boards with HAND-SHAPED suspicion, chronological (CONCEPT.md).
  // Grid channel OR score > hi; grid_score > 0 filters census-only noise (2026-08-10).
  const hands = framesMatching(rows, { klass: "occluded", min: thresholds.lo })
    .map((f) => ({
      ...f,
      cells: f.cells.filter((c) => (c.grid_score ?? 0) > 0 || c.score > thresholds.hi),
    }))
    .filter((f) => f.cells.length > 0)
    .sort((a, b) => a.stem.localeCompare(b.stem))
    .map((f) => ({
      stem: f.stem,
      squares: f.cells.map((c) => c.square),
      reads: Object.fromEntries(
        f.cells.map((c) => [
          c.square,
          c.grid_score ? `grid ${c.grid_score.toFixed(2)}` : `score ${c.score.toFixed(2)}`,
        ]),
      ),
      accept: Object.fromEntries(f.cells.map((c) => [c.square, "occluded"])),
    }));

  return (
    <main className="space-y-5">
      <header className="space-y-2">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
          <Link className="text-muted-foreground text-base underline underline-offset-4" href="/">
            ←
          </Link>
          {name}
          <Badge variant={source === "pack" ? "secondary" : "destructive"}>
            {source === "pack"
              ? "occluded-proposals.jsonl"
              : source === "fixture"
                ? "FIXTURE — phase 02 has not written proposals yet"
                : "no proposals on disk"}
          </Badge>
        </h1>
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground">{seen.done}</strong>/{boards} Bretter bearbeitet ·{" "}
          <span
            title={
              summary.read === "sidecar"
                ? "aus occluded-proposals.summary.json"
                : "aus occluded-proposals.jsonl nachgezählt — der Producer hat hier noch keine summary.json geschrieben"
            }
          >
            {done}/{rows.length} Zellen entschieden
            {summary.read === "fallback" ? " (nachgezählt)" : ""}
          </span>{" "}
          · thresholds hi <strong className="text-foreground">{thresholds.hi}</strong> / lo{" "}
          <strong className="text-foreground">{thresholds.lo}</strong>
          {thresholds.declared ? "" : " (defaults — the file declared none)"} · session{" "}
          <code>{session.sessionId}</code>, board {session.boardSize} px, pad_side{" "}
          {session.crop.pad_side}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm">
          Nothing to review: neither <code>data/realgames/{name}/occluded-proposals.jsonl</code> nor
          a fixture <code>test-fixtures/occluded-proposals.{name}.jsonl</code> exists.
        </p>
      ) : (
        <Streams
          boards={boards}
          boardsDone={seen.done}
          decided={Object.fromEntries(decided)}
          filter={{
            classes: classesSeen(rows),
            frames: framesMatching(rows, { klass: DEFAULT_CLASS, min: DEFAULT_MIN }).map((f) => ({
              stem: f.stem,
              squares: f.cells.map((c) => c.square),
            })),
            cells: 0,
          }}
          frames={frames}
          hands={hands}
          name={name}
          next={await nextOpenSession(name)}
          sessionId={session.sessionId}
          streams={streams}
        />
      )}
    </main>
  );
}
