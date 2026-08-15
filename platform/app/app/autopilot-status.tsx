"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { AutopilotStatus } from "@/lib/autopilot-engine";

const POLL_MS = 5000;

export type Autopilot = {
  status: AutopilotStatus | null;
  busy: boolean;
  toggle: () => void;
};

/**
 * The machine's state, polled on every page — it works whether or not a tab is open on the right one.
 * `mounted` gates the first paint: the strip is client-driven, and SSR markup only produced
 * hydration targets for whatever edits the DOM before React loads.
 */
export function useAutopilot(): Autopilot {
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useSyncExternalStore(subscribeNever, snapshotTrue, snapshotFalse);

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

  return { status: mounted ? status : null, busy, toggle };
}

const subscribeNever = () => () => {};
const snapshotTrue = () => true;
const snapshotFalse = () => false;

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
