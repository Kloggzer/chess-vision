"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { autopilotDot, autopilotState, useAutopilot, type Autopilot } from "./autopilot-status";

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

/** The machine, in one line: a dot, what it does, and the one control that stops it. */
function AutopilotBlock({ autopilot }: { autopilot: Autopilot }) {
  const { status, busy, toggle } = autopilot;
  return (
    <div className="border-border space-y-1 border-t pt-3">
      <div className="flex items-center gap-2 px-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${autopilotDot(status)}`} />
        <span className="text-xs font-medium">Autopilot</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <button
                className="border-border ml-auto cursor-pointer rounded border px-1.5 py-0.5 text-xs disabled:opacity-50 max-sm:h-11 max-sm:px-3"
                disabled={busy || status === null}
                onClick={toggle}
                type="button"
              >
                {status?.paused ? "▶" : "⏸"}
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent>hält die Kette an; ein laufender Job wird nicht abgebrochen. Vor einem Trainingslauf pausieren. Der Zustand überlebt den Neustart.</TooltipContent>
        </Tooltip>
      </div>
      <p className="text-muted-foreground truncate px-2 text-xs">
        {autopilotState(status)}
        {status && status.queued > 0 ? ` · ${status.queued} wartet` : ""}
      </p>
      {/* Was das Ding IST, sichtbar — „keine erklärung dafür im ui ist nicht hilfreich" (2026-08-15). */}
      <p className="text-muted-foreground/70 px-2 text-[11px] leading-snug">
        führt die Maschinenschritte (Label, Export, Vorschläge) selbst aus, einen nach dem anderen.
        Vor einem Trainingslauf pausieren.
      </p>
      {status?.error ? (
        <p className="text-destructive truncate px-2 text-xs">
          {status.error}
        </p>
      ) : null}
    </div>
  );
}

export function Shell({ counts, children }: { counts: NavCounts; children: React.ReactNode }) {
  const autopilot = useAutopilot();
  const repair = autopilot.status?.repair ?? 0;
  const items = (
    <>
      <Row count={counts.zuege} item={STROM[0]} />
      <Row count={counts.labeln} item={STROM[1]} />
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
      <aside className="border-border sticky top-0 hidden h-screen w-48 shrink-0 flex-col gap-0.5 border-r px-2 pt-4 pb-10 md:flex">
        <Link className="text-foreground mb-2 px-2 text-sm font-semibold tracking-tight" href="/">
          chesslab
        </Link>
        <p className={HEADING}>Strom</p>
        {items}
        <p className={HEADING}>Ablage</p>
        {rest}
        <div className="mt-auto">
          <AutopilotBlock autopilot={autopilot} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="border-border flex items-center gap-1 overflow-x-auto border-b px-2 py-1 md:hidden">
          {items}
          {rest}
          <span className={`ml-auto h-2 w-2 shrink-0 rounded-full ${autopilotDot(autopilot.status)}`} />
        </nav>
        <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-6 2xl:max-w-[1560px]">{children}</main>
      </div>
    </div>
  );
}
