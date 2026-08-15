"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** The visible affordance for prose: a `?` chip whose tooltip opens fast (native title was too slow). */
export function Why({ children }: { children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={children}
          className="border-muted-foreground/70 text-muted-foreground hover:border-foreground hover:text-foreground inline-flex h-4.5 w-4.5 cursor-help items-center justify-center rounded-full border text-[11px] leading-none"
          role="note"
          tabIndex={0}
        >
          ?
        </span>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}

/** For SERVER components: the slot target must be born client-side, or Radix' asChild rejects the
 *  RSC-serialized child ("failed to slot onto its children") — server children ride INSIDE it. */
export function Hint({ tip, children, className = "" }: { tip: string; children: React.ReactNode; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${className}`}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/** One line per page: name, the number that matters, the prose behind a `?` (never on the page). */
export function PageTitle({
  title,
  count,
  why,
  sub = false,
  children,
}: {
  title: string;
  count?: number;
  why?: string;
  sub?: boolean;
  children?: React.ReactNode;
}) {
  const Tag = sub ? "h2" : "h1";
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <Tag className={`font-semibold tracking-tight ${sub ? "text-base" : "text-xl"}`}>{title}</Tag>
      {count === undefined ? null : <span className="text-muted-foreground text-sm tabular-nums">{count}</span>}
      {why ? <Why>{why}</Why> : null}
      {children ? <span className="ml-auto flex items-center gap-3 text-xs">{children}</span> : null}
    </div>
  );
}
