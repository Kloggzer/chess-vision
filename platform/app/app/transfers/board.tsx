"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TransferRow } from "@/lib/ingest";
import type { Job } from "@/lib/jobs";

type Board = { transfers: TransferRow[]; pending: { name: string; bytes: number; files: number }[]; jobs: Job[] };

const GB = 1024 * 1024 * 1024;
const size = (bytes: number) => (bytes >= GB ? `${(bytes / GB).toFixed(2)} GB` : `${Math.round(bytes / (1024 * 1024))} MB`);
const when = (iso?: string) => (iso ? iso.slice(0, 19).replace("T", " ") : "");

const TONE: Record<Job["state"], "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  running: "secondary",
  done: "default",
  failed: "destructive",
  skipped: "outline",
};

/**
 * Polls while it is open. Five seconds is chosen against the thing being watched: a transfer runs
 * for minutes and a pack for longer, so a faster poll would only cost the machine that is building
 * the pack.
 */
export function TransferBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  async function startLabel(name: string) {
    setStarting(name);
    try {
      const response = await fetch(`/api/ingest/session/${name}/label`, { method: "POST" });
      if (!response.ok) throw new Error(await response.text());
      const job = (await response.json()) as Job;
      setBoard((current) =>
        current ? { ...current, jobs: [job, ...current.jobs.filter((row) => row.name !== name)] } : current,
      );
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

  if (!board) return <p className="text-muted-foreground text-sm">loading…</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-medium">In flight</h2>
        {board.pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">nothing incoming</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {board.pending.map((row) => (
              <li className="flex gap-3" key={row.name}>
                <span className="font-mono">{row.name}</span>
                <span className="text-muted-foreground">
                  {row.files} files · {size(row.bytes)} here
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Arrived</h2>
        {board.transfers.length === 0 ? (
          <p className="text-muted-foreground text-sm">no transfer yet</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {board.transfers.map((row) => (
              <li className="flex flex-wrap items-center gap-3" key={`${row.name}-${row.ts}`}>
                <span className="font-mono">{row.name}</span>
                <Badge variant={row.status === "landed" ? "default" : "outline"}>{row.status}</Badge>
                <span className="text-muted-foreground">
                  {row.files} files · {size(row.bytes)} · {row.device} · {when(row.ts)}
                </span>
                {row.status === "held" ? (
                  <span className="text-muted-foreground">kept in {row.target} — the target already existed</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">training-video-pack</h2>
        {board.jobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">no job has run</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {board.jobs.map((job) => (
              <li className="flex flex-wrap items-center gap-3" key={job.name}>
                <span className="font-mono">{job.name}</span>
                <Badge variant={TONE[job.state]}>{job.state}</Badge>
                <span className="text-muted-foreground">{when(job.finishedAt ?? job.startedAt ?? job.queuedAt)}</span>
                {job.pack ? (
                  <span className="text-muted-foreground">
                    accepted {job.pack.acceptedFrames} boards / {job.pack.acceptedCrops} crops · quarantine{" "}
                    {job.pack.quarantineFrames} boards / {job.pack.quarantineCrops} crops · occluded proposals{" "}
                    {job.pack.occludedProposalCrops}
                  </span>
                ) : null}
                {job.candidate ? (
                  <Button asChild size="sm">
                    <Link href={`/confirm/${job.candidate}`}>zur Label-Seite</Link>
                  </Button>
                ) : null}
                {job.state === "skipped" && /no games\/|no game record/.test(job.reason ?? "") ? (
                  <Button
                    disabled={starting === job.name}
                    onClick={() => void startLabel(job.name)}
                    size="sm"
                    variant="outline"
                  >
                    {starting === job.name ? "wird gestartet…" : "Aufnahme labeln (Barrel korrigiert)"}
                  </Button>
                ) : null}
                {job.reason ? <span className="text-destructive">{job.reason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
