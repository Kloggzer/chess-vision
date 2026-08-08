import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { decidedKeys } from "@/lib/corrections";
import { loadProposals, proposalKey, splitStreams } from "@/lib/proposals";
import { loadSession, sessionId } from "@/lib/session";
import { Streams } from "./streams";

export const dynamic = "force-dynamic";

export default async function RelabelPage({ params }: PageProps<"/relabel/[name]">) {
  const { name } = await params;
  const { rows, thresholds, source } = await loadProposals(name);
  const session = await loadSession(name);
  const decided = await decidedKeys(sessionId(name));
  const streams = splitStreams(rows, thresholds);

  // The drilldown needs the FEN of every frame a proposal points at — nothing more of the log.
  const stems = [...new Set(rows.map((r) => r.frame))].sort();
  const frames = stems.map((stem) => ({
    stem,
    ply: session.byStem.get(stem)?.ply ?? 0,
    fen: session.byStem.get(stem)?.fen ?? "8/8/8/8/8/8/8/8 w - - 0 1",
  }));
  const done = rows.filter((r) => decided.has(proposalKey(r))).length;

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
          {rows.length} proposals, {done} already in corrections.jsonl · thresholds hi{" "}
          <strong className="text-foreground">{thresholds.hi}</strong> / lo{" "}
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
          decided={Object.fromEntries(decided)}
          frames={frames}
          name={name}
          sessionId={session.sessionId}
          streams={streams}
        />
      )}
    </main>
  );
}
