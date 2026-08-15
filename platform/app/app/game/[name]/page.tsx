import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCard, type GameInfo } from "@/app/cards";
import { Badge } from "@/components/ui/badge";
import { chainState, sessionDir } from "@/lib/chain";
import { judgedKeys } from "@/lib/corrections";
import { listGames, loadCandidate, truthSans } from "@/lib/data";
import { jobHistory, jobLogTail, type Job } from "@/lib/jobs";
import { loadMeta } from "@/lib/meta";
import { boardProgressOf, type ProposalSummary } from "@/lib/proposal-summaries";
import { loadProposals, proposalKey } from "@/lib/proposals";
import { bareFrames } from "@/lib/queues";
import { sessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * `/game/<name>` — one recording, everything (CONCEPT.md §3.1). The daily loop never opens it; `.`
 * in a stream does, in a new tab, when a card raises a question the stream cannot answer.
 *
 * It is the ONE page that may be slow: the exact `cellsDone` costs a parse of this game's proposal
 * rows, which is precisely what the list surfaces refuse to pay and what a debug surface is for.
 */
async function gameInfo(name: string, lastJob: Job | null): Promise<{ info: GameInfo; summary: ProposalSummary }> {
  const [meta, candidate, chain, pgn] = await Promise.all([
    loadMeta(name),
    loadCandidate(name).catch(() => null),
    chainState(name),
    truthSans(name).catch(() => null),
  ]);
  const decided = await judgedKeys(sessionId(name));
  const { summary, boards, done } = await boardProgressOf(name, decided.keys());
  const { rows, source } = await loadProposals(name);
  const info: GameInfo = {
    name,
    title: meta.title ?? null,
    archived: meta.archived ?? false,
    frames: await bareFrames(name, chain),
    createdAt: candidate?.created_at ?? null,
    confirmed: candidate?.confirmed ?? false,
    confirmedAt: candidate?.confirmed_at ?? null,
    plies: candidate?.moves.length ?? 0,
    reviewed: candidate?.reviewed_plies?.length ?? 0,
    pgnPlies: pgn ? pgn.length : null,
    boards,
    boardsDone: done,
    cells: rows.length,
    cellsDone: rows.filter((r) => decided.has(proposalKey(r))).length,
    source,
    read: summary.read,
    chain,
    lastJob,
  };
  return { info, summary };
}

export default async function GamePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!(await listGames()).includes(name)) notFound();
  const history = await jobHistory(name, 12);
  const { info: game, summary } = await gameInfo(name, history[0] ?? null);

  return (
    <main className="space-y-4">
      <nav className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <Link className="underline underline-offset-4" href="/">
          ← Partien
        </Link>
        <Link className="underline underline-offset-4" href="/strom/zuege">
          züge
        </Link>
        <Link className="underline underline-offset-4" href="/strom/labeln">
          labeln
        </Link>
        <Link className="underline underline-offset-4" href={`/confirm/${name}`}>
          confirm-Ansicht
        </Link>
        <Link className="underline underline-offset-4" href={`/relabel/${name}`}>
          Brett-Queue
        </Link>
      </nav>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{game.title ?? name}</h1>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
          <span>{name}</span>
          <Badge variant="secondary">{game.chain.step ?? "kein Schritt"}</Badge>
          <span>{sessionDir(name)}</span>
        </p>
      </header>

      <ul>
        <GameCard game={game} />
      </ul>

      <section className="border-border grid gap-x-6 gap-y-1 rounded-lg border p-3 text-sm sm:grid-cols-2">
        <Fact label="Kandidat">
          {game.plies} Halbzüge · {game.confirmed ? `bestätigt ${game.confirmedAt ?? ""}` : "unbestätigt"} ·{" "}
          {game.reviewed} reviewed plies
        </Fact>
        <Fact label="reference.pgn">{game.pgnPlies === null ? "keine" : `${game.pgnPlies} Halbzüge`}</Fact>
        <Fact label="Aufnahme">{game.chain.video ?? "keine im Bundle"}</Fact>
        <Fact label="Session">{game.chain.hasSession ? "exportiert" : "nicht exportiert"}</Fact>
        <Fact label="Bretter">
          {game.boardsDone}/{game.boards} · {game.cellsDone}/{game.cells} Zellen ({game.read})
        </Fact>
        <Fact label="Propose-Lauf">
          {summary.model ?? "Modell unbekannt"} · hi {summary.hi} / lo {summary.lo} ·{" "}
          {summary.written_at ?? "ohne Datum"}
        </Fact>
        {game.chain.videoBroken ? <Fact label="Video">{game.chain.videoBroken}</Fact> : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Job-Log ({history.length})</h2>
        {history.map((job, i) => (
          <JobRow job={job} key={`${job.queuedAt}-${i}`} />
        ))}
        {history.length === 0 ? (
          <p className="text-muted-foreground text-sm">Für diese Aufnahme lief noch nie ein Job.</p>
        ) : null}
      </section>
    </main>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap gap-x-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-xs break-all">{children}</span>
    </p>
  );
}

/** The ledger row and what the tool printed — the answer `.` on an empty candidate goes looking for. */
async function JobRow({ job }: { job: Job }) {
  const tail = await jobLogTail(job);
  return (
    <details className="border-border rounded-lg border px-3 py-2 text-sm">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-xs">{job.kind ?? "job"}</span>
        <Badge variant={job.state === "failed" ? "destructive" : job.state === "done" ? "default" : "secondary"}>
          {job.state}
        </Badge>
        <span className="text-muted-foreground font-mono text-xs">
          {(job.finishedAt ?? job.startedAt ?? job.queuedAt).slice(0, 19).replace("T", " ")}
        </span>
        {job.notBefore ? (
          <span className="text-muted-foreground text-xs">gehalten bis {job.notBefore.slice(11, 19)}</span>
        ) : null}
        {job.reason ? <span className="text-destructive text-xs">{job.reason}</span> : null}
      </summary>
      {job.command ? <p className="text-muted-foreground mt-2 font-mono text-xs break-all">$ {job.command}</p> : null}
      {tail.length > 0 ? (
        <pre className="bg-muted/40 mt-2 max-h-80 overflow-auto rounded p-2 font-mono text-xs">{tail.join("\n")}</pre>
      ) : job.log ? (
        <p className="text-muted-foreground mt-2 font-mono text-xs break-all">{job.log} — leer</p>
      ) : null}
    </details>
  );
}
