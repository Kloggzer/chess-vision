"use client";

import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export function Bar({ done, total, className = "w-24" }: { done: number; total: number; className?: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <span className={`bg-muted inline-block h-1 shrink-0 overflow-hidden rounded ${className}`}>
      <span className="bg-primary block h-full" style={{ width: `${pct}%` }} />
    </span>
  );
}

/** One figure with its unit and one bar — the second and third count belong in `title`. */
export function Progress({
  done,
  total,
  unit,
  title,
  bar = "w-24",
}: {
  done: number;
  total: number;
  unit: string;
  title?: string;
  bar?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const content = (
    <span className="text-muted-foreground flex items-center gap-2 text-xs tabular-nums">
      <span>
        <span className="text-foreground font-medium">{done}</span>/{total} {unit} · {pct} %
      </span>
      <Bar className={bar} done={done} total={total} />
    </span>
  );

  if (!title) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}
