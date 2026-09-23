import Link from "next/link";
import { notFound } from "next/navigation";
import { GameCard, type GameInfo } from "@/app/cards";
import { PageTitle } from "@/app/page-title";
import { Badge } from "@/components/ui/badge";
import { SessionDelete } from "@/components/session-delete";
import { chainState } from "@/lib/chain/chain";
import { failureParts } from "@/lib/failure";
import { judgedKeys } from "@/lib/session-store/corrections";
import { listGames, loadCandidate, truthSans } from "@/lib/session-store/recordings";
import { jobLogTail } from "@/lib/chain/job-log";
import { jobHistory } from "@/lib/chain/ledger";
import type { Job } from "@/lib/chain/slot";
import { loadMeta } from "@/lib/session-store/meta";
import { boardProgressOf, modelReadRows, readKey, type ReadCensus } from "@/lib/session-store/model-reads";
import { bareFrames } from "@/lib/chain/queues";
import { sessionDir, sessionId } from "@/lib/session-store/session";

export const dynamic = "force-dynamic";

/**
 * `/game/<name>` — one recording, everything (CONCEPT.md §3.1). The daily loop never opens it; `.`
 * in a stream does, in a new tab, when a card raises a question the stream cannot answer.
 *
 * It is the ONE page that may be slow: the exact `cellsDone` costs a parse of this game's model
 * reads, which is precisely what the list surfaces refuse to pay and what a debug surface is for.
 */
async function gameInfo(name: string, lastJob: Job | null): Promise<{ info: GameInfo; census: ReadCensus }> {
  const [meta, candidate, chain, pgn] = await Promise.all([
    loadMeta(name),
    loadCandidate(name).catch(() => null),
    chainState(name),
    truthSans(name),
  ]);
  const decided = await judgedKeys(name);
  const { census, boards, done } = await boardProgressOf(name, decided.keys());
  const rows = await modelReadRows(name);
  const info: GameInfo = {
    name,
    sessionId: sessionId(name),
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
    cells: census.cells,
    cellsDone: rows.filter((r) => decided.has(readKey(r))).length,
    modelRead: census.present,
    chain,
    lastJob,
  };
  return { info, census };
}

export default async function GamePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!(await listGames()).includes(name)) notFound();
  const history = await jobHistory(name, 12);
  const { info: game, census } = await gameInfo(name, history[0] ?? null);

  return (
    <main className="space-y-4">
      <PageTitle title={game.title ?? name}>
        <Link className="text-muted-foreground hover:text-foreground" href={`/confirm/${name}`}>
          Sichtprüfung
        </Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/strom/labeln">
          Brett-Queue
        </Link>
      </PageTitle>
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs">
        <span>{name}</span>
        <span title={game.chain.reason}>{game.chain.step ?? "kein Schritt"}</span>
        <span className="font-sans normal-case">{game.chain.reason}</span>
        <span className="truncate">{sessionDir(name)}</span>
      </p>

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
        <Fact label="Session">
          {game.chain.hasSession ? "exportiert" : game.chain.outdated.export ? "Export abgebrochen" : "nicht exportiert"}
          {game.chain.hasSession ? <SessionDelete className="ml-3" sessionId={sessionId(name)} /> : null}
        </Fact>
        <Fact label="Bretter">
          {census.present ? `${game.boardsDone}/${game.boards} · ${game.cellsDone}/${game.cells} Zellen` : "—"}
        </Fact>
        <Fact label="Matten">
          {game.chain.mattes.total === 0
            ? "— keine verdeckten Frames"
            : `${game.chain.mattes.done}/${game.chain.mattes.total} Alphas · Ziel ${game.chain.mattes.target}`}
        </Fact>
        <Fact label="Modell-Lesarten">
          {census.present
            ? `${census.model ?? "Modell unbekannt"} · ${census.writtenAt ?? "ohne Datum"}`
            : "— nicht gemessen: model-reads.jsonl fehlt"}
        </Fact>
        {game.chain.passInputsUnknown ? (
          <Fact label="Temporal-Pass">
            Stand unbekannt — der Lauf ist älter als sein Matte-Stempel; ob seither SAM-Zeilen dazukamen, sieht die Kette
            erst nach einem neuen Pass
          </Fact>
        ) : null}
        {game.chain.videoBroken ? <Fact label="Video">{game.chain.videoBroken}</Fact> : null}
      </section>

      <section className="space-y-1.5">
        <PageTitle count={history.length} sub title="Job-Log" />
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
        {job.reason ? <span className="text-destructive text-xs">{failureParts(job.reason).text}</span> : null}
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
