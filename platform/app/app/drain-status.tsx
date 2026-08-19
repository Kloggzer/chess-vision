"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobStep } from "@/lib/backlog";
import type { DrainStatus } from "@/lib/drain";

const POLL_MS = 5000;

export type Drain = {
  status: DrainStatus | null;
  busy: boolean;
  /** Start this step's backlog, oldest recording first. Nothing else ever starts a job. */
  start: (step: JobStep) => void;
  /** End the running drain after its current recording. */
  stop: () => void;
  /** A refusal the press has to answer for (no model chosen, a foreign lock, nothing waiting). */
  note: string | null;
};

/**
 * What runs and what waits, polled on every page â€” it works whether or not a tab is open.
 * No mounted-gate: SSR already renders `status === null`, so a gate changes nothing there, but it
 * makes every re-render during hydration fall back to null and mismatch the DOM the poll just wrote.
 */
export function useDrain(): Drain {
const [status, setStatus] = useState<DrainStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const read = () =>
      void fetch("/api/drain")
        .then((r) => r.json() as Promise<DrainStatus>)
        .then(setStatus)
        .catch(() => undefined);
    read();
    const timer = setInterval(read, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const post = useCallback((body: Record<string, unknown>) => {
    setBusy(true);
    setNote(null);
    void fetch("/api/drain", { method: "POST", body: JSON.stringify(body) })
      .then(async (r) => {
        const answer = (await r.json()) as DrainStatus & { error?: string };
        if (r.ok) setStatus(answer);
        else setNote(answer.error ?? r.statusText);
      })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }, []);

  const start = useCallback((step: JobStep) => post({ step }), [post]);
  const stop = useCallback(() => post({ stop: true }), [post]);

  return { status, busy, start, stop, note };
}

/** One line: what is in the slot right now, and how far the running backlog has got. */
export function runState(status: DrainStatus | null): string {
  if (!status) return "â€¦";
  // Not a defect: another process holds the slot, and its job is really running.
  const foreign = status.foreignLock;
  if (foreign) return `lÃ¤uft (pid ${foreign.pid}): ${foreign.job} ${foreign.name}`;
  const running = status.running ? `${status.running.step} ${status.running.name}` : null;
  const drain = status.drain;
  if (drain) {
    const rest = drain.stopped ? "gestoppt" : `noch ${drain.left}`;
    return `${drain.step} ${drain.done} fertig, ${rest}${running ? ` Â· ${running.split(" ")[1]}` : ""}`;
  }
  return running ? `lÃ¤uft Â· ${running}` : "nichts lÃ¤uft";
}

export function runDot(status: DrainStatus | null): string {
  if (!status) return "bg-muted-foreground/40";
  if (status.error) return "bg-destructive";
  if (status.running || status.foreignLock) return "bg-amber-400";
  return "bg-muted-foreground/40";
}
