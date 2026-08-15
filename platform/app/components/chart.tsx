"use client";

import { barPct } from "@/lib/chart";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

/** Roles, not colours: the subject of the chart, the other named class, the veto, the rest. */
export type Tone = "subject" | "deep" | "second" | "veto" | "context";

const FILL: Record<Tone, string> = {
  subject: "bg-viz-subject",
  deep: "bg-viz-deep",
  second: "bg-viz-second",
  veto: "bg-viz-veto",
  context: "bg-viz-context",
};

export type Bar = { key: string; label: string; value: number; text: string; tone: Tone; why?: string };
export type Mark = { at: number; label: string; why: string };

export function Legend({ items }: { items: { tone: Tone; label: string }[] }) {
  return (
    <ul className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {items.map((item) => (
        <li className="flex items-center gap-1.5" key={item.label}>
          <span className={`h-2 w-2 shrink-0 rounded-[1px] ${FILL[item.tone]}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function Track({ children, why }: { children: React.ReactNode; why?: string }) {
  const track = "bg-muted/60 relative block h-3 min-w-12 rounded-[2px]";
  if (!why) return <span className={track}>{children}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={track}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{why}</TooltipContent>
    </Tooltip>
  );
}

export function BarRows({ bars, max, labelClass = "max-w-52" }: { bars: Bar[]; max: number; labelClass?: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs">
      {bars.map((bar) => (
        <div className="contents" key={bar.key}>
          <span className={`truncate font-mono ${labelClass}`}>
            {bar.label}
          </span>
          <Track why={bar.why ?? `${bar.label}: ${bar.text}`}>
            <span
              className={`absolute inset-y-0 left-0 rounded-r-[3px] ${FILL[bar.tone]}`}
              style={{ width: `${barPct(bar.value, max)}%` }}
            />
          </Track>
          <span className="text-right tabular-nums">{bar.text}</span>
        </div>
      ))}
    </div>
  );
}

export type Pair = { key: string; label: string; why: string; top: Bar; bottom: Bar };

/** Two measures of one run, one above the other on a shared axis — never a second axis. */
export function PairBars({ pairs, max, labelClass = "max-w-52" }: { pairs: Pair[]; max: number; labelClass?: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 text-xs">
      {pairs.map((pair) => (
        <div className="contents" key={pair.key}>
          <span className={`truncate font-mono ${labelClass}`}>
            {pair.label}
          </span>
          <Track why={pair.why}>
            {[pair.top, pair.bottom].map((bar, index) => (
              <span
                className={`absolute left-0 h-[5px] rounded-r-[3px] ${FILL[bar.tone]} ${index === 0 ? "top-0" : "bottom-0"}`}
                key={bar.key}
                style={{ width: `${barPct(bar.value, max)}%` }}
              />
            ))}
          </Track>
          <span className="text-right tabular-nums">
            {pair.top.text} · {pair.bottom.text}
          </span>
        </div>
      ))}
    </div>
  );
}

const markShift = (pct: number) => (pct > 85 ? "-translate-x-full" : pct < 6 ? "" : "-translate-x-1/2");

/** One ratio against measured points; the marks are drawn where they were measured, never as a gate. */
export function Meter({ label, value, max, text, marks, why }: {
  label: string;
  value: number;
  max: number;
  text: string;
  marks: Mark[];
  why?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs">
        {why ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{label}</span>
            </TooltipTrigger>
            <TooltipContent>{why}</TooltipContent>
          </Tooltip>
        ) : (
          <span>{label}</span>
        )}
        <span className="tabular-nums">{text}</span>
      </div>
      <Track why={why}>
        <span className="bg-viz-subject absolute inset-y-0 left-0 rounded-r-[3px]" style={{ width: `${barPct(value, max)}%` }} />
        {marks.map((mark) => (
          <Tooltip key={mark.label}>
            <TooltipTrigger asChild>
              <span
                className="bg-foreground/60 absolute -inset-y-1 w-px"
                style={{ left: `${barPct(mark.at, max)}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>{mark.why}</TooltipContent>
          </Tooltip>
        ))}
      </Track>
      <div className="text-muted-foreground relative h-4 text-[10px]">
        {marks.map((mark) => (
          <Tooltip key={mark.label}>
            <TooltipTrigger asChild>
              <span
                className={`absolute top-0 whitespace-nowrap tabular-nums ${markShift(barPct(mark.at, max))}`}
                style={{ left: `${barPct(mark.at, max)}%` }}
              >
                {mark.label}
              </span>
            </TooltipTrigger>
            <TooltipContent>{mark.why}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

export function Tile({ label, value, sub, why }: { label: string; value: string; sub: string; why?: string }) {
  const tile = (
    <div className="border-border rounded-lg border px-3 py-2">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="text-2xl leading-tight font-semibold">{value}</p>
      <p className="text-muted-foreground truncate text-[11px]">{sub}</p>
    </div>
  );

  if (!why) return tile;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {tile}
      </TooltipTrigger>
      <TooltipContent>{why}</TooltipContent>
    </Tooltip>
  );
}
