"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChainState, ChainStep } from "@/lib/chain";
import { failureParts, logName } from "@/lib/failure";
import type { Job } from "@/lib/jobs";
import type { Progress } from "@/lib/progress";

/** What each button does, in the words of the thing it produces rather than the command it runs. */
const STEP: Record<ChainStep, { label: string; hint: string }> = {
  label: { label: "Label", hint: "Aufnahme durch den Tracker abspielen → candidate.json (dauert Minuten)" },
  confirm: { label: "Bestätigen", hint: "die Züge des Trackers beurteilen — der eine Schritt, den nur ein Mensch kann" },
  export: { label: "Session exportieren", hint: "bestätigte Intervalle → data/sessions/rg-<name>/" },
  propose: { label: "Vorschläge erzeugen", hint: "dirty Zellen bewerten → occluded-proposals.jsonl" },
  relabel: { label: "Labeln", hint: "Brett-Brush und Zellraster" },
};

const BUSY = new Set(["queued", "running"]);

/**
 * The chain's next step as ONE control.
 * Disk knows what's missing; confirm/relabel are links, machine steps are buttons.
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
    return <span className="text-muted-foreground text-xs">kein Video im Bundle — nichts zu labeln</span>;
  }
  // A replay of an unfinalized MP4 fails after minutes of decoding; the atom chain says so in
  // milliseconds, so the card states it instead of offering the button.
  if (step === "label" && state.videoBroken) {
    return <span className="text-destructive text-xs">{state.videoBroken}</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {step === "confirm" || step === "relabel" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              className="border-border inline-flex items-center rounded border px-2 py-0.5 underline-offset-4 hover:underline max-sm:h-11 max-sm:px-3"
              href={`/${step}/${name}`}
            >
              {STEP[step].label} →
            </Link>
          </TooltipTrigger>
          <TooltipContent>{STEP[step].hint}</TooltipContent>
        </Tooltip>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <button
                className="border-border cursor-pointer rounded border px-2 py-0.5 disabled:opacity-50 max-sm:h-11 max-sm:px-3"
                disabled={busy}
                onClick={() => void post({ step })}
                type="button"
              >
                {busy ? `${STEP[step].label}…` : STEP[step].label}
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{STEP[step].hint}</TooltipContent>
        </Tooltip>
      )}
      {lensRefused(job) ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="border-destructive text-destructive cursor-pointer rounded border px-2 py-0.5 max-sm:h-11 max-sm:px-3"
              onClick={() => void post({ step: "label", lens: false })}
              type="button"
            >
              Label ohne Linsen-Korrektur
            </button>
          </TooltipTrigger>
          <TooltipContent>the verb refused because it could not fit this camera&apos;s barrel — the phone camera has none to remove (TODO.md, 2026-08-10). Labels then rest on the raw image.</TooltipContent>
        </Tooltip>
      ) : null}
      {state.offeredPgn ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="text-muted-foreground cursor-pointer underline underline-offset-4 max-sm:inline-flex max-sm:h-11 max-sm:items-center"
              onClick={() => void post({ step: "adopt-pgn" })}
              type="button"
            >
              PGN übernehmen
            </button>
          </TooltipTrigger>
          <TooltipContent>copy the phone&apos;s own PGN in as reference.pgn — the confirm screen then compares instead of asking</TooltipContent>
        </Tooltip>
      ) : null}
      {/* Permanent, not a warning: those crops differ from corrected ones (specs/52). */}
      {job?.kind === "label" && job.lens === false ? (
        <span className="text-muted-foreground">gelabelt OHNE Linsen-Korrektur</span>
      ) : null}
      {/* Nur ein Scheitern, das den AKTUELLEN Schritt blockiert — eine überholte Ledger-Zeile
          (die Kette ist weiter, z.B. nach einem CLI-Lauf) ist Geschichte, keine Warnung. */}
      {job?.kind && job.state === "failed" && job.kind === step ? (
        <Badge variant="destructive">{job.kind} gescheitert</Badge>
      ) : null}
      {busy ? <Working progress={progress} /> : null}
      {job?.state === "failed" && job.kind === step && job.reason ? <FailureLine reason={job.reason} /> : null}
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
  const { atSeconds, totalSeconds, plies, frames, tail, bytes } = progress;
  // Seconds of video where the replay reports them, frames where a chesslab step counts its own.
  const pct = atSeconds !== null && totalSeconds
    ? Math.min(100, Math.round((atSeconds / totalSeconds) * 100))
    : frames ? Math.min(100, Math.round((frames.at / frames.total) * 100))
    : null;
  const unit = atSeconds !== null && totalSeconds
    ? `${Math.round(atSeconds)}/${Math.round(totalSeconds)} s`
    : frames ? `${frames.at}/${frames.total} Frames` : "";
  return (
    <span className="flex flex-wrap items-center gap-2">
      {pct !== null ? (
        <>
          <span className="bg-muted h-1.5 w-24 overflow-hidden rounded">
            <span className="bg-primary block h-full transition-all" style={{ width: `${pct}%` }} />
          </span>
          <span className="text-muted-foreground tabular-nums">
            {pct} % · {unit}
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

function FailureLine({ reason }: { reason: string }) {
  const { text, log } = failureParts(reason);
  if (!log) {
    return <span className="text-destructive max-w-sm truncate">{text}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-destructive max-w-sm truncate">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{text} · {logName(log)}</TooltipContent>
    </Tooltip>
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
