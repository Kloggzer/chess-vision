"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FailureLine } from "@/components/failure-line";
import { JobBadge } from "@/components/job-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchJson, messageOf } from "@/lib/answer";
import { failureParts } from "@/lib/failure";
import { when } from "@/lib/when";
import type { TransferRow } from "@/lib/ingest/ingest";
import type { Job } from "@/lib/chain/slot";

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
        <JobBadge state={job.state} />
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
          className={`${job.state === "failed" ? "text-destructive" : "text-muted-foreground"} min-w-0`}
        />
      ) : null}
    </li>
  );
}

/** Five seconds: a transfer runs for minutes and a pack longer, so a faster poll only costs the
 *  machine that builds the pack. */
export function TransferBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /** Eigener Zustand: ein erfolgreicher Poll darf die Absage eines Knopfdrucks nicht wegwischen. */
  const [fault, setFault] = useState<string | null>(null);

  async function startLabel(name: string) {
    setStarting(name);
    setNote(null);
    try {
      const job = await fetchJson<Job>(`/api/ingest/session/${name}/label`, { method: "POST" });
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
      setNote(failureParts(messageOf(error)).text);
    } finally {
      setStarting(null);
    }
  }

  useEffect(() => {
    let live = true;
    const load = () =>
      fetchJson<Board>("/api/ingest/jobs")
        .then((value) => {
          if (!live) return;
          setBoard(value);
          setFault(null);
        })
        // Ohne den Grund stand die Seite auf "laedt…", waehrend die Route ihn schon geschrieben
        // hatte — ein stiller Fang ist hier nicht Geduld, sondern eine falsche Auskunft.
        .catch((error: unknown) => live && setFault(String(error)));
    void load();
    const timer = setInterval(load, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);

  if (!board) {
    return fault ? (
      <p className="text-destructive text-xs">{fault}</p>
    ) : (
      <p className="text-muted-foreground text-sm">lädt…</p>
    );
  }
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
        {fault ? <p className="text-destructive">{fault}</p> : null}
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
