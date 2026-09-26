"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/answer";
import type { DrainTarget } from "@/lib/job-steps";
import type { DrainStatus } from "@/lib/chain/drain";

const POLL_MS = 5000;

export type Drain = {
  status: DrainStatus | null;
  busy: boolean;
  /** Start this step's backlog, oldest recording first. Nothing else ever starts a job. */
  start: (step: DrainTarget) => void;
  /** End the running drain after its current recording. */
  stop: () => void;
  /** A refusal the press has to answer for (no model chosen, a foreign lock, nothing waiting). */
  note: string | null;
  /** Warum der Stand gerade fehlt. Ein stiller Fang liess die Leiste "…" zeigen, als waere sie
   *  noch am Laden — der Grund stand schon im Rumpf der Absage. */
  fault: string | null;
};

/**
 * What runs and what waits, polled on every page — it works whether or not a tab is open.
 * No mounted-gate: SSR already renders `status === null`, so a gate changes nothing there, but it
 * makes every re-render during hydration fall back to null and mismatch the DOM the poll just wrote.
 */
export function useDrain(): Drain {
const [status, setStatus] = useState<DrainStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [fault, setFault] = useState<string | null>(null);

  useEffect(() => {
    const read = () =>
      void fetchJson<DrainStatus>("/api/drain")
        .then((value) => {
          setStatus(value);
          setFault(null);
        })
        .catch((error: unknown) => setFault(String(error)));
    read();
    const timer = setInterval(read, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const post = useCallback((body: Record<string, unknown>) => {
    setBusy(true);
    setNote(null);
    void fetchJson<DrainStatus>("/api/drain", { method: "POST", body: JSON.stringify(body) })
      .then(setStatus)
      // Ein stiller `catch` liess den Knopf zurueckschnappen, als waere der Auftrag gelaufen.
      .catch((error: unknown) => setNote(String(error)))
      .finally(() => setBusy(false));
  }, []);

  const start = useCallback((step: DrainTarget) => post({ step }), [post]);
  const stop = useCallback(() => post({ stop: true }), [post]);

  return { status, busy, start, stop, note, fault };
}

/** One line: what is in the slot right now, and how far the running backlog has got. */
export function runState(status: DrainStatus | null): string {
  if (!status) return "…";
  // Not a defect: another process holds the slot, and its job is really running.
  const foreign = status.foreignLock;
  if (foreign) return `läuft (pid ${foreign.pid}): ${foreign.job} ${foreign.name}`;
  const running = status.running ? `${status.running.step} ${status.running.name}` : null;
  const drain = status.drain;
  if (drain) {
    const rest = drain.stopped ? "gestoppt" : `noch ${drain.left}`;
    return `${drain.step} ${drain.done} fertig, ${rest}${running ? ` · ${running.split(" ")[1]}` : ""}`;
  }
  return running ? `läuft · ${running}` : "nichts läuft";
}

export function runDot(status: DrainStatus | null): string {
  if (!status) return "bg-muted-foreground/40";
  if (status.error) return "bg-destructive";
  if (status.running || status.foreignLock) return "bg-amber-400";
  return "bg-muted-foreground/40";
}
