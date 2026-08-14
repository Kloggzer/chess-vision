"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ChainState, ChainStep } from "@/lib/chain";
import type { Job } from "@/lib/jobs";
import type { Progress } from "@/lib/progress";

/** What each button does, in the words of the thing it produces rather than the command it runs. */
const STEP: Record<ChainStep, { label: string; hint: string }> = {
  label: { label: "Label", hint: "replay the recording through the tracker → candidate.json (minutes)" },
  confirm: { label: "Confirm", hint: "judge the tracker's plies — the human step nothing else can do" },
  export: { label: "Export session", hint: "confirmed intervals → data/sessions/rg-<name>/" },
  propose: { label: "Propose occluded", hint: "score the dirty cells → occluded-proposals.jsonl" },
  relabel: { label: "Relabel", hint: "bucket, tinder and the board brush" },
};

const BUSY = new Set(["queued", "running"]);

/**
 * The chain's next step as ONE control.
 *
 * A row of four buttons would be four ways to get an error message: every step needs the previous
 * step's file, and the disk already knows which one is missing. The two steps that are a human's
 * (confirm, relabel) are links, the two that are the machine's are buttons that queue a job — and
 * the job's own state comes back here, because a replay takes minutes and a button that just went
 * quiet is indistinguishable from one that did nothing.
 */
export function ChainActions({ name, state, lastJob = null }: { name: string; state: ChainState; lastJob?: Job | null }) {
  const router = useRouter();
  // Seeded from the server: a reload used to forget the failure, which took the one control that
  // ANSWERS it (the raw run after a lens refusal) off the card until the same job failed again.
  const [job, setJob] = useState<Job | null>(lastJob);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const step = state.step;
  const busy = job !== null && BUSY.has(job.state);

  // Every two seconds while a job runs: a replay decodes a whole video and the only honest sign of
  // life is what it has printed. Idle cards poll nothing.
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      void fetch(`/api/chain/${name}/progress`)
        .then((r) => r.json() as Promise<{ job: Job | null; progress: Progress }>)
        .then((d) => {
          setJob(d.job);
          setProgress(d.progress);
          // The chain moved on: the card's own state is stale, so let the server re-read the disk.
          if (d.job && !BUSY.has(d.job.state)) router.refresh();
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(timer);
  }, [busy, name, router]);

  async function post(body: Record<string, string | boolean>) {
    setNote(null);
    const res = await fetch(`/api/chain/${name}`, { method: "POST", body: JSON.stringify(body) });
    const answer = (await res.json()) as Job & { error?: string; reason?: string; adopted?: string };
    if (!res.ok) return setNote(answer.error ?? res.statusText);
    if (answer.reason && !answer.state) return setNote(answer.reason);
    if (answer.adopted) {
      setNote(`reference.pgn ← ${answer.adopted}`);
      return router.refresh();
    }
    setJob(answer);
  }

  // Flagged useless: there is no next step by definition, and the undo lives on the card.
  if (step === null) {
    return <span className="text-muted-foreground text-xs">als nutzlos markiert — kein Schritt offen</span>;
  }
  if (step === "label" && !state.video) {
    return <span className="text-muted-foreground text-xs">no video in this bundle — nothing to label</span>;
  }
  // A replay of an unfinalized MP4 fails after minutes of decoding; the atom chain says so in
  // milliseconds, so the card states it instead of offering the button.
  if (step === "label" && state.videoBroken) {
    return <span className="text-destructive text-xs">{state.videoBroken}</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {step === "confirm" || step === "relabel" ? (
        <Link
          className="border-border inline-flex items-center rounded border px-2 py-0.5 underline-offset-4 hover:underline max-sm:h-11 max-sm:px-3"
          href={`/${step}/${name}`}
          title={STEP[step].hint}
        >
          {STEP[step].label} →
        </Link>
      ) : (
        <button
          className="border-border cursor-pointer rounded border px-2 py-0.5 disabled:opacity-50 max-sm:h-11 max-sm:px-3"
          disabled={busy}
          onClick={() => void post({ step })}
          title={STEP[step].hint}
          type="button"
        >
          {busy ? `${STEP[step].label}…` : STEP[step].label}
        </button>
      )}
      {lensRefused(job) ? (
        <button
          className="border-destructive text-destructive cursor-pointer rounded border px-2 py-0.5 max-sm:h-11 max-sm:px-3"
          onClick={() => void post({ step: "label", lens: false })}
          title="the verb refused because it could not fit this camera's barrel — the phone camera has none to remove (TODO.md, 2026-08-10). Labels then rest on the raw image."
          type="button"
        >
          Label ohne Linsen-Korrektur
        </button>
      ) : null}
      {state.offeredPgn ? (
        <button
          className="text-muted-foreground cursor-pointer underline underline-offset-4 max-sm:inline-flex max-sm:h-11 max-sm:items-center"
          onClick={() => void post({ step: "adopt-pgn" })}
          title="copy the phone's own PGN in as reference.pgn — the confirm screen then compares instead of asking"
          type="button"
        >
          PGN übernehmen
        </button>
      ) : null}
      {job && job.kind ? (
        <Badge variant={job.state === "failed" ? "destructive" : job.state === "done" ? "default" : "secondary"}>
          {job.kind}: {job.state}
        </Badge>
      ) : null}
      {busy ? <Working progress={progress} /> : null}
      {job?.reason ? <span className="text-destructive">{job.reason}</span> : null}
      {note ? <span className="text-destructive">{note}</span> : null}
    </span>
  );
}

/**
 * What the job has reached, in three readings that cost nothing to produce.
 *
 * The bar appears only with a real denominator (the recording's own duration from `session.yaml`);
 * otherwise the ply count and the tool's last line carry it. "0 s of 128 s" is information;
 * a spinner is not.
 */
function Working({ progress }: { progress: Progress | null }) {
  if (!progress) return <span className="text-muted-foreground">starting…</span>;
  const { atSeconds, totalSeconds, plies, tail, bytes } = progress;
  const pct = atSeconds !== null && totalSeconds ? Math.min(100, Math.round((atSeconds / totalSeconds) * 100)) : null;
  return (
    <span className="flex flex-wrap items-center gap-2">
      {pct !== null ? (
        <>
          <span className="bg-muted h-1.5 w-24 overflow-hidden rounded">
            <span className="bg-primary block h-full transition-all" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-muted-foreground tabular-nums">
            {pct} % · {Math.round(atSeconds ?? 0)}/{Math.round(totalSeconds ?? 0)} s
          </span>
        </>
      ) : null}
      {plies > 0 ? <span className="text-muted-foreground">{plies} plies</span> : null}
      <span className="text-muted-foreground max-w-md truncate font-mono">
        {tail.at(-1) ?? (bytes > 0 ? "" : "no output yet")}
      </span>
    </span>
  );
}

/**
 * The one failure the user can answer with a second press.
 *
 * `replay … label lens` refuses when no lens fit is accepted, which is correct for the rig camera
 * and permanent for the phone's — so the refusal, and only the refusal, offers the raw run.
 */
function lensRefused(job: Job | null): boolean {
  return job?.state === "failed" && /lens/i.test(job.reason ?? "");
}
