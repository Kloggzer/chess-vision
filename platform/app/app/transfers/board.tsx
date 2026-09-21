"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { failureParts, logName } from "@/lib/failure";
import { when } from "@/lib/when";
import type { TransferRow } from "@/lib/ingest";
import type { Job } from "@/lib/jobs";

type Board = {
  transfers: TransferRow[];
  pending: { name: string; bytes: number; files: number }[];
  jobs: Job[];
};

const GB = 1024 * 1024 * 1024;
const size = (bytes: number) =>
  bytes >= GB
    ? `${(bytes / GB).toFixed(2)} GB`
    : `${Math.round(bytes / (1024 * 1024))} MB`;

const FRESH = 8;
const ROW = "flex flex-wrap items-baseline gap-x-3 gap-y-0.5";
const MUTED = "text-muted-foreground tabular-nums";

const TONE: Record<
  Job["state"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  queued: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
  skipped: "outline",
  stopped: "outline",
};

/** The reason in the words that act on it: no path in the sentence, the log file name beside it. */
function FailureLine({ reason, tone }: { reason: string; tone: string }) {
  const { text, log } = failureParts(reason);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`${tone} min-w-0 truncate`}>
          {text}
          {log ? (
            <span className="text-muted-foreground"> · {logName(log)}</span>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function Older({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details>
      <summary className="text-muted-foreground cursor-pointer text-xs max-sm:min-h-11">
        ältere anzeigen ({count})
      </summary>
      <div className="mt-1">{children}</div>
    </details>
  );
}

function TransferLine({ row }: { row: TransferRow }) {
  return (
    <li className={ROW}>
      <span className="font-mono">{row.name}</span>
      {row.status === "held" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline">zurückgehalten</Badge>
          </TooltipTrigger>
          <TooltipContent>
            liegt in {row.target} — das Ziel gab es schon
          </TooltipContent>
        </Tooltip>
      ) : null}
      <span className={MUTED} suppressHydrationWarning>
        {when(row.ts)} · {row.files} Dateien · {size(row.bytes)} · {row.device}
      </span>
    </li>
  );
}

function JobLine({
  job,
  starting,
  onLabel,
}: {
  job: Job;
  starting: boolean;
  onLabel: (name: string) => void;
}) {
  const relabel =
    job.state === "skipped" &&
    /no games\/|no game record/.test(job.reason ?? "");
  return (
    <li className={ROW}>
      <span className="font-mono">{job.name}</span>
      {job.state === "done" ? null : (
        <Badge variant={TONE[job.state]}>{job.state}</Badge>
      )}
      <span className={MUTED} suppressHydrationWarning>
        {when(job.finishedAt ?? job.startedAt ?? job.queuedAt)}
      </span>
      {job.pack ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={MUTED}>
              {job.pack.acceptedFrames} Bretter / {job.pack.acceptedCrops} Crops
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Quarantäne {job.pack.quarantineFrames} Bretter /{" "}
            {job.pack.quarantineCrops} Crops · occluded-Vorschläge{" "}
            {job.pack.occludedProposalCrops} Crops
          </TooltipContent>
        </Tooltip>
      ) : null}
      {job.candidate ? (
        <Button asChild size="sm">
          <Link href={`/confirm/${job.candidate}`}>zur Label-Seite</Link>
        </Button>
      ) : null}
      {relabel ? (
        <Button
          disabled={starting}
          onClick={() => onLabel(job.name)}
          size="sm"
          variant="outline"
        >
          {starting ? "wird gestartet…" : "Aufnahme labeln (Barrel korrigiert)"}
        </Button>
      ) : null}
      {job.reason ? (
        <FailureLine
          reason={job.reason}
          tone={
            job.state === "failed"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        />
      ) : null}
    </li>
  );
}

/**
 * Polls while it is open. Five seconds is chosen against the thing being watched: a transfer runs
 * for minutes and a pack for longer, so a faster poll would only cost the machine that is building
 * the pack.
 */
export function TransferBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function startLabel(name: string) {
    setStarting(name);
    setNote(null);
    try {
      const response = await fetch(`/api/ingest/session/${name}/label`, {
        method: "POST",
      });
      if (!response.ok)
        return setNote(failureParts(await response.text()).text);
      const job = (await response.json()) as Job;
      setBoard((current) =>
        current
          ? {
              ...current,
              jobs: [job, ...current.jobs.filter((row) => row.name !== name)],
            }
          : current,
      );
    } catch (error) {
      // Ohne diesen Zweig war ein abgebrochener POST eine unbehandelte Rejection: der Knopf ging
      // zurueck auf "Aufnahme labeln", und nichts auf der Seite sagte, dass nichts passiert ist.
      setNote(String(error));
    } finally {
      setStarting(null);
    }
  }

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/ingest/jobs")
        .then((r) => r.json() as Promise<Board>)
        .then((value) => live && setBoard(value))
        .catch(() => undefined);
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  if (!board) return <p className="text-muted-foreground text-sm">lädt…</p>;
  const transfers = [...board.transfers].sort((a, b) =>
    b.ts.localeCompare(a.ts),
  );

  return (
    <div className="space-y-5 text-xs">
      <section className="space-y-1.5">
        <h2 className="text-base font-semibold">
          Unterwegs{" "}
          <span className="text-muted-foreground text-sm font-normal">
            {board.pending.length}
          </span>
        </h2>
        {board.pending.length === 0 ? (
          <p className="text-muted-foreground">Nichts kommt gerade an.</p>
        ) : (
          <ul className="space-y-1">
            {board.pending.map((row) => (
              <li className={ROW} key={row.name}>
                <span className="font-mono">{row.name}</span>
                <span className={MUTED}>
                  {row.files} Dateien · {size(row.bytes)} hier
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-semibold">
          Angekommen{" "}
          <span className="text-muted-foreground text-sm font-normal">
            {transfers.length}
          </span>
        </h2>
        {transfers.length === 0 ? (
          <p className="text-muted-foreground">Noch kein Transfer.</p>
        ) : null}
        <ul className="space-y-1">
          {transfers.slice(0, FRESH).map((row) => (
            <TransferLine key={`${row.name}-${row.ts}`} row={row} />
          ))}
        </ul>
        <Older count={Math.max(0, transfers.length - FRESH)}>
          <ul className="space-y-1">
            {transfers.slice(FRESH).map((row) => (
              <TransferLine key={`${row.name}-${row.ts}`} row={row} />
            ))}
          </ul>
        </Older>
      </section>

      <section className="space-y-1.5">
        <h2 className="text-base font-semibold">
          training-video-pack{" "}
          <span className="text-muted-foreground text-sm font-normal">
            {board.jobs.length}
          </span>
        </h2>
        {board.jobs.length === 0 ? (
          <p className="text-muted-foreground">Es lief noch kein Job.</p>
        ) : null}
        {note ? <p className="text-destructive">{note}</p> : null}
        <ul className="space-y-1">
          {board.jobs.slice(0, FRESH).map((job) => (
            <JobLine
              job={job}
              key={job.name}
              onLabel={(name) => void startLabel(name)}
              starting={starting === job.name}
            />
          ))}
        </ul>
        <Older count={Math.max(0, board.jobs.length - FRESH)}>
          <ul className="space-y-1">
            {board.jobs.slice(FRESH).map((job) => (
              <JobLine
                job={job}
                key={job.name}
                onLabel={(name) => void startLabel(name)}
                starting={starting === job.name}
              />
            ))}
          </ul>
        </Older>
      </section>
    </div>
  );
}
