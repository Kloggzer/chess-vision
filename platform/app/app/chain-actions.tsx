"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { readAnswer } from "@/lib/answer";
import type { ChainState, ChainStep } from "@/lib/chain/chain";
import { STEP } from "@/lib/chain/steps";
import { failureParts, logName } from "@/lib/failure";
import type { Job } from "@/lib/chain/jobs";
import type { Progress } from "@/lib/chain/progress";

const BUSY = new Set(["queued", "running"]);

/** Half-matted is the ordinary state, so the button carries the count instead of claiming a start. */
function stepLabel(step: ChainStep, state: ChainState): string {
  const { done, total, reported, reportedOrphan } = state.mattes;
  if (step !== "matte") return STEP[step].label;
  const pile = done > 0 ? ` ${done}/${total}` : "";
  const open = reported - reportedOrphan;
  // Die Waisen getrennt: `+34 gemeldet` liess sie wie Arbeit aussehen, die ein Druck erledigt.
  const stale = reportedOrphan > 0 ? ` (${reportedOrphan} ohne Frame)` : "";
  return `${STEP.matte.label}${pile}${reported > 0 ? ` +${open} gemeldet${stale}` : ""}`;
}

/** The press is a `--limit` run, so it says what it will compute — an unannounced GPU hour is not on. */
function stepHint(step: ChainStep, state: ChainState): string {
  const { done, target, total, reported, reportedOrphan } = state.mattes;
  if (step !== "matte") return STEP[step].hint;
  const open = reported - reportedOrphan;
  // Ein Urteil auf einen Frame, den dieser Export nicht mehr fuehrt: es gibt kein Brett zu
  // schneiden, also holt es kein Lauf. Sagen statt es als offene Arbeit zeigen.
  const orphans = reportedOrphan > 0
    ? ` ${reportedOrphan} weitere Meldungen zeigen auf Frames, die dieser Export nicht mehr führt — die holt kein Lauf.`
    : "";
  // Gemeldete zuerst: sie liegen NICHT im `occluded`-Stapel (meist `stale`), also holt sie kein
  // gewöhnlicher Lauf — genau der Grund, warum markierte Finger ungemattet blieben.
  if (open > 0) {
    return `${STEP.matte.hint}. Ein Druck rechnet die ${open} von Hand gemeldeten Frames — die stehen nicht im Stapel und kämen sonst nie dran. Danach die ${Math.max(0, target - done)} des Stapels.${orphans}`;
  }
  const rest =
    total > target
      ? ` — die restlichen ${total - target} holt "occluders alpha-worker" im Terminal`
      : "";
  return `${STEP.matte.hint}. Ein Druck rechnet ${Math.max(0, target - done)} Frames, Ziel ${target} von ${total} verdeckten${rest}.${orphans}`;
}

/**
 * The chain's next step as ONE control.
 * Disk knows what's missing; confirm/labeln are links, machine steps are buttons.
 */
export function ChainActions({
  name,
  state,
  lastJob = null,
  showWhat = true,
}: {
  name: string;
  state: ChainState;
  lastJob?: Job | null;
  showWhat?: boolean;
}) {
  const router = useRouter();
  // Seeded from the server: a reload used to forget the failure, which took the one control that
  // ANSWERS it (the raw run after a lens refusal) off the card until the same job failed again.
  const [job, setJob] = useState<Job | null>(lastJob);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const step = state.step;
  const busy = job !== null && BUSY.has(job.state);
  const label = step ? stepLabel(step, state) : "";
  const hint = step ? stepHint(step, state) : "";
  const what = step ? STEP[step].what : "";

  // Every two seconds while a job runs: a replay decodes a whole video and the only honest sign of
  // life is what it has printed. Idle cards poll nothing.
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => {
      void fetch(`/api/chain/${name}/progress`)
        .then((r) => readAnswer<{ job: Job | null; progress: Progress }>(r))
        .then((d) => {
          setJob(d.job);
          setProgress(d.progress);
          // The chain moved on: the card's own state is stale, so let the server re-read the disk.
          if (d.job && !BUSY.has(d.job.state)) router.refresh();
        })
        // Eine Absage traegt kein `job`: gesetzt hiess das "nichts laeuft" und warf beim
        // naechsten Zugriff. Der Grund gehoert auf die Karte, der Stand bleibt stehen.
        .catch((error: unknown) => setNote(String(error)));
    }, 2000);
    return () => clearInterval(timer);
  }, [busy, name, router]);

  async function post(body: Record<string, string | boolean>) {
    setNote(null);
    const res = await fetch(`/api/chain/${name}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const answer = (await res.json()) as Job & {
      error?: string;
      reason?: string;
    };
    if (!res.ok) return setNote(answer.error ?? res.statusText);
    if (answer.reason && !answer.state) return setNote(answer.reason);
    setJob(answer);
  }

  // Flagged useless: there is no next step by definition, and the undo lives on the card.
  if (step === null) {
    return <span className="text-muted-foreground text-xs">{state.reason}</span>;
  }
  if (step === "label" && !state.video) {
    return (
      <span className="text-muted-foreground text-xs">
        kein Video im Bundle — nichts zu labeln
      </span>
    );
  }
  // A replay of an unfinalized MP4 fails after minutes of decoding; the atom chain says so in
  // milliseconds, so the card states it instead of offering the button.
  if (step === "label" && state.videoBroken) {
    return (
      <span className="text-destructive text-xs">{state.videoBroken}</span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {step === "confirm" || step === "labeln" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              className="border-border inline-flex items-center rounded border px-2 py-0.5 underline-offset-4 hover:underline max-sm:h-11 max-sm:px-3"
              href={step === "labeln" ? "/strom/labeln" : `/${step}/${name}`}
            >
              {label} →
            </Link>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
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
                {busy ? `${label}…` : label}
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      )}
      {showWhat ? <span className="text-muted-foreground max-w-xl">{what}</span> : null}
      {/* Der Grund, nicht nur der Schritt: eine wieder aufgemachte Sprosse sieht sonst aus wie
          ein vergessener Klick. */}
      <span className="text-muted-foreground max-w-xl">{state.reason}</span>
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
          <TooltipContent>
            the verb refused because it could not fit this camera&apos;s barrel
            — the phone camera has none to remove (TODO.md, 2026-08-10). Labels
            then rest on the raw image.
          </TooltipContent>
        </Tooltip>
      ) : null}
      {phoneRefused(job) ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="border-destructive text-destructive cursor-pointer rounded border px-2 py-0.5 max-sm:h-11 max-sm:px-3"
              onClick={() => void post({ step: "label" })}
              type="button"
            >
              Züge am PC neu erkennen
            </button>
          </TooltipTrigger>
          <TooltipContent>
            der Datensatz vom Handy reicht für diese Aufnahme nicht — der Tracker
            spielt das Video ab und schlägt die Zugfolge selbst vor (Minuten).
          </TooltipContent>
        </Tooltip>
      ) : null}
      {/* Permanent, not a warning: those crops differ from corrected ones (specs/52). */}
      {job?.kind === "label" && job.lens === false ? (
        <span className="text-muted-foreground">
          gelabelt OHNE Linsen-Korrektur
        </span>
      ) : null}
      {/* Nur ein Scheitern, das den AKTUELLEN Schritt blockiert — eine überholte Ledger-Zeile
          (die Kette ist weiter, z.B. nach einem CLI-Lauf) ist Geschichte, keine Warnung. */}
      {job?.kind && job.state === "failed" && job.kind === step ? (
        <Badge variant="destructive">{job.kind} gescheitert</Badge>
      ) : null}
      {busy ? <Working progress={progress} /> : null}
      {job?.state === "failed" && job.kind === step && job.reason ? (
        <FailureLine reason={job.reason} />
      ) : null}
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
  if (!progress)
    return <span className="text-muted-foreground">starting…</span>;
  const { atSeconds, totalSeconds, plies, frames, tail, bytes } = progress;
  // Seconds of video where the replay reports them, frames where a chesslab step counts its own.
  const pct =
    atSeconds !== null && totalSeconds
      ? Math.min(100, Math.round((atSeconds / totalSeconds) * 100))
      : frames
        ? Math.min(100, Math.round((frames.at / frames.total) * 100))
        : null;
  const unit =
    atSeconds !== null && totalSeconds
      ? `${Math.round(atSeconds)}/${Math.round(totalSeconds)} s`
      : frames
        ? `${frames.at}/${frames.total} Frames`
        : "";
  return (
    <span className="flex flex-wrap items-center gap-2">
      {pct !== null ? (
        <>
          <span className="bg-muted h-1.5 w-24 overflow-hidden rounded">
            <span
              className="bg-primary block h-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="text-muted-foreground tabular-nums">
            {pct} % · {unit}
          </span>
        </>
      ) : null}
      {plies > 0 ? (
        <span className="text-muted-foreground">{plies} plies</span>
      ) : null}
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
        <span className="text-destructive max-w-sm truncate">{text}</span>
      </TooltipTrigger>
      <TooltipContent>
        {text} · {logName(log)}
      </TooltipContent>
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

/** Every refusal of the record step has the same answer: let the replay read the video instead. */
function phoneRefused(job: Job | null): boolean {
  return job?.kind === "phone-record" && job.state === "failed";
}
