"use client";

import { useCallback, useEffect, useState } from "react";
import type { AutopilotStatus } from "@/lib/autopilot-engine";

const POLL_MS = 5000;

export type Autopilot = {
  status: AutopilotStatus | null;
  busy: boolean;
  toggle: () => void;
};

/**
 * The machine's state, polled on every page — it works whether or not a tab is open on the right one.
 * No mounted-gate: SSR already renders `status === null`, so a gate changes nothing there, but it
 * makes every re-render during hydration fall back to null and mismatch the DOM the poll just wrote.
 */
export function useAutopilot(): Autopilot {
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const read = () =>
      void fetch("/api/autopilot")
        .then((r) => r.json() as Promise<AutopilotStatus>)
        .then(setStatus)
        .catch(() => undefined);
    read();
    const timer = setInterval(read, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const toggle = useCallback(() => {
    if (!status) return;
    setBusy(true);
    void fetch("/api/autopilot", { method: "POST", body: JSON.stringify({ paused: !status.paused }) })
      .then((r) => r.json() as Promise<AutopilotStatus>)
      .then(setStatus)
      .finally(() => setBusy(false));
  }, [status]);

  return { status, busy, toggle };
}

export function autopilotState(status: AutopilotStatus | null): string {
  if (!status) return "…";
  // Not a defect: another server process holds the slot, and its job is really running.
  const foreign = status.foreignLock;
  if (foreign) return `läuft (pid ${foreign.pid}): ${foreign.job} ${foreign.name}`;
  const running = status.running
    ? `${status.running.step} ${status.running.name}${status.running.auto ? "" : " (manuell)"}`
    : null;
  // A pause never kills a running job, so both facts are true at once and both are shown.
  if (status.paused) return running ? `pausiert · ${running} läuft noch` : "pausiert";
  if (running) return `läuft · ${running}`;
  return status.queued > 0 ? "startet gleich" : "nichts zu tun";
}

export function autopilotDot(status: AutopilotStatus | null): string {
  if (!status) return "bg-muted-foreground/40";
  if (status.error) return "bg-destructive";
  if (status.paused) return "bg-muted-foreground";
  if (status.running || status.foreignLock) return "bg-amber-400";
  return status.queued > 0 ? "bg-sky-400" : "bg-emerald-500/70";
}
