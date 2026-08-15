"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { AutopilotStatus } from "@/lib/autopilot-engine";

const POLL_MS = 5000;

// On every page — machine works everywhere; state shouldn't need navigation.
export function AutopilotStrip() {
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [busy, setBusy] = useState(false);
  // The strip is client-driven start to finish, so SSR contributes nothing but hydration targets
  // for whatever edits the DOM before React loads (measured: a pre-hydration `disabled` mismatch
  // that survived a .next wipe). Until hydration is over it renders inert markup both sides agree on.
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

  async function toggle() {
    if (!status) return;
    setBusy(true);
    try {
      const res = await fetch("/api/autopilot", { method: "POST", body: JSON.stringify({ paused: !status.paused }) });
      setStatus((await res.json()) as AutopilotStatus);
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) {
    return (
      <div className="border-border text-muted-foreground mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <span className="text-foreground font-medium">Autopilot</span>
        <span>…</span>
      </div>
    );
  }

  return (
    <div className="border-border text-muted-foreground mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
      <span className="text-foreground font-medium">Autopilot</span>
      <span>{state(status)}</span>
      {status && status.queued > 0 ? <span>{status.queued} in Warteschlange</span> : null}
      {status && status.repair > 0 ? (
        <Link className="text-destructive underline underline-offset-4" href="/reparatur">
          {status.repair} Reparatur
        </Link>
      ) : null}
      {/* Not a defect: another server process holds the slot, and its job is really running. */}
      {status?.foreignLock ? (
        <span>
          läuft (anderer Prozess, pid {status.foreignLock.pid}): {status.foreignLock.job} {status.foreignLock.name}
        </span>
      ) : null}
      {status?.error ? <span className="text-destructive max-w-md truncate">{status.error}</span> : null}
      <span className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline">Autopilot pausieren, bevor ein Trainingslauf startet</span>
        <button
          className="border-border cursor-pointer rounded border px-2 py-0.5 disabled:opacity-50 max-sm:h-11 max-sm:px-3"
          disabled={busy || status === null}
          onClick={() => void toggle()}
          title="hält die Kette an; ein laufender Job wird nicht abgebrochen. Der Zustand überlebt den Neustart."
          type="button"
        >
          {status?.paused ? "▶ weiter" : "⏸ pausieren"}
        </button>
      </span>
    </div>
  );
}

const subscribeNever = () => () => {};
const snapshotTrue = () => true;
const snapshotFalse = () => false;

function state(status: AutopilotStatus | null): string {
  if (!status) return "…";
  const running = status.running
    ? `läuft · ${status.running.step} ${status.running.name}${status.running.auto ? "" : " (manuell)"}`
    : null;
  // A pause never kills a running job, so both facts are true at once and both are shown.
  if (status.paused) return running ? `pausiert · ${running.slice("läuft · ".length)} läuft noch` : "pausiert";
  if (running) return running;
  return status.queued > 0 ? "startet gleich" : "nichts zu tun";
}
