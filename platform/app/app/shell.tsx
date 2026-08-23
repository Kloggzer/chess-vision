"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { JobStep } from "@/lib/backlog";
import { runDot, runState, useDrain, type Drain } from "./drain-status";

export type NavCounts = { zuege: number; labeln: number };

type Item = { href: string; label: string; also?: readonly string[] };

const STROM: readonly Item[] = [
  { href: "/strom/zuege", label: "Züge", also: ["/confirm"] },
  { href: "/strom/labeln", label: "Labeln" },
  { href: "/strom/matte", label: "Matte", also: [] },
];

const ABLAGE: readonly Item[] = [
  { href: "/", label: "Partien", also: ["/game"] },
  { href: "/corpus", label: "Korpus" },
  { href: "/transfers", label: "Transfers" },
];

const REPARATUR: Item = { href: "/reparatur", label: "Reparatur" };

//: Which nav entries carry a badge. `/strom/matte` has none — its work only exists once the alpha
//: worker has run, and a 0 there would read as "nothing to check" rather than "not measured yet".
const COUNT_OF: Record<string, ((c: NavCounts) => number) | undefined> = {
  "/strom/zuege": (c) => c.zuege,
  "/strom/labeln": (c) => c.labeln,
};

function active(path: string, item: Item): boolean {
  if ((item.also ?? []).some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return true;
  return item.href === "/" ? path === "/" : path === item.href || path.startsWith(`${item.href}/`);
}

function Row({ item, count, tone = "" }: { item: Item; count?: number; tone?: string }) {
  const here = active(usePathname(), item);
  return (
    <Link
      aria-current={here ? "page" : undefined}
      className={`flex shrink-0 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm max-sm:h-11 ${
        here ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
      href={item.href}
    >
      <span className="truncate">{item.label}</span>
      {count ? <span className={`text-xs tabular-nums ${tone}`}>{count}</span> : null}
    </Link>
  );
}

const HEADING = "text-muted-foreground/70 px-2 pt-2 text-[10px] font-medium tracking-widest uppercase";

const ORDER = "älteste Aufnahme zuerst, eine nach der anderen; Stopp beendet nach der laufenden.";

/** The four steps of the Kette that are jobs — `chain-actions.tsx` names them the same way. */
const STEPS: readonly { step: JobStep; label: string; hint: string }[] = [
  { step: "label", label: "Label", hint: `Aufnahme durch den Tracker abspielen → candidate.json (Minuten je Aufnahme); ${ORDER}` },
  { step: "export", label: "Export", hint: `bestätigte Intervalle → data/recordings/<name>/; ${ORDER}` },
  { step: "matte", label: "Matten", hint: `SAM 3 schneidet die Hand aus verdeckten Frames (GPU, ~12 s pro Frame); ${ORDER}` },
  {
    step: "model-read",
    label: "Modell-Lesarten",
    hint: `jede Zelle der Session von einem Modell lesen lassen → model-reads.jsonl; braucht CHESSLAB_MODEL_READ_RUN; ${ORDER}`,
  },
];

function StepButton({ drain, entry, wide }: { drain: Drain; entry: (typeof STEPS)[number]; wide: boolean }) {
  const { status, busy, start } = drain;
  const waiting = status?.waiting?.[entry.step] ?? 0;
  const running = status?.drain?.step === entry.step;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={wide ? "block" : "shrink-0"}>
          <button
            aria-label={running ? `${entry.label}: läuft` : `${entry.label}: ${waiting} Aufnahmen warten`}
            className={`border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-medium disabled:opacity-40 ${
              wide ? "w-full" : "h-11 shrink-0"
            } ${running ? "bg-accent" : "hover:bg-accent/50"} cursor-pointer disabled:cursor-default`}
            disabled={!status || busy || status.drain !== null || status.running !== null || waiting === 0}
            onClick={() => start(entry.step)}
            type="button"
          >
            <span className="truncate">{entry.label}</span>
            <span className="text-muted-foreground text-xs tabular-nums">{running ? "läuft" : waiting}</span>
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{entry.hint}</TooltipContent>
    </Tooltip>
  );
}

/** The app's primary control: one press per step, and the one line that says what is running. */
function StepPanel({ drain, wide }: { drain: Drain; wide: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={wide ? "space-y-1.5 px-2 pt-1.5" : "flex items-center gap-1.5 px-2 py-1.5"}>
        {STEPS.map((entry) => (
          <span className={wide ? "block" : "shrink-0"} key={entry.step}>
            <button
              aria-label={`${entry.label}: lädt`}
              className={`border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm font-medium opacity-40 ${
                wide ? "w-full" : "h-11 shrink-0"
              } cursor-default`}
              disabled
              type="button"
            >
              <span className="truncate">{entry.label}</span>
              <span className="text-muted-foreground text-xs tabular-nums">…</span>
            </button>
          </span>
        ))}
        <p className={`text-muted-foreground flex items-center gap-2 truncate text-xs ${wide ? "" : "ml-auto"}`}>
          <span className="bg-muted-foreground/40 h-2 w-2 shrink-0 rounded-full" />
          <span className="truncate">…</span>
        </p>
      </div>
    );
  }
  const { status, busy, stop, note } = drain;
  const stoppable = status !== null && (status.drain !== null || status.running !== null);
  return (
    <div className={wide ? "space-y-1.5 px-2 pt-1.5" : "flex items-center gap-1.5 px-2 py-1.5"}>
      {STEPS.map((entry) => (
        <StepButton drain={drain} entry={entry} key={entry.step} wide={wide} />
      ))}
      {stoppable ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={wide ? "block" : "shrink-0"}>
              <button
                className={`border-destructive text-destructive cursor-pointer rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-40 ${wide ? "w-full" : "h-11"}`}
                disabled={busy}
                onClick={stop}
                type="button"
              >
                Stopp
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            beendet den laufenden Prozess SOFORT und nimmt keine weitere Aufnahme. Der alpha-worker
            schreibt jeden Frame einzeln weg — verloren geht höchstens der Frame in Arbeit.
          </TooltipContent>
        </Tooltip>
      ) : null}
      <p className={`text-muted-foreground flex items-center gap-2 truncate text-xs ${wide ? "" : "ml-auto"}`}>
        <span className={`h-2 w-2 shrink-0 rounded-full ${runDot(status)}`} />
        <span className="truncate">{runState(status)}</span>
      </p>
      {note ? <p className="text-destructive text-xs">{note}</p> : null}
      {status?.error ? <p className="text-destructive truncate text-xs">{status.error}</p> : null}
    </div>
  );
}

export function Shell({ counts, children }: { counts: NavCounts; children: React.ReactNode }) {
  const drain = useDrain();
  const repair = drain.status?.repair ?? 0;
  // Mapped, not indexed: `/strom/matte` sat in STROM for a day without ever being drawn, because
  // the two Rows were written out by hand and the third entry had no line of its own.
  const items = (
    <>
      {STROM.map((item) => (
        <Row count={COUNT_OF[item.href]?.(counts)} item={item} key={item.href} />
      ))}
    </>
  );
  const rest = (
    <>
      {ABLAGE.map((item) => (
        <Row item={item} key={item.href} />
      ))}
      {repair > 0 ? <Row count={repair} item={REPARATUR} tone="text-destructive" /> : null}
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="border-border sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-0.5 border-r px-2 pt-4 pb-10 md:flex">
        <Link className="text-foreground mb-2 px-2 text-sm font-semibold tracking-tight" href="/">
          chesslab
        </Link>
        <p className={HEADING}>Strom</p>
        {items}
        <p className={HEADING}>Ablage</p>
        {rest}
        <div className="border-border mt-auto border-t pt-1">
          <p className={HEADING}>Schritte</p>
          <StepPanel drain={drain} wide />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="border-border flex items-center gap-1 overflow-x-auto border-b px-2 py-1 md:hidden">
          {items}
          {rest}
        </nav>
        {/* Dieselben Knöpfe wie in der Leiste — auf dem Handy als scrollende Zeile. */}
        <div className="border-border overflow-x-auto border-b md:hidden">
          <StepPanel drain={drain} wide={false} />
        </div>
        <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6 2xl:max-w-[1560px]">{children}</main>
      </div>
    </div>
  );
}
