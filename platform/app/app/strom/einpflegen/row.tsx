"use client";

import Link from "next/link";
import { ChainActions } from "@/app/chain-actions";
import type { IntakeRow } from "@/lib/intake";

/** Hand-rolled, not `QueueRowItem`: that component IS the `<li>` and takes no children, and the
 *  point of this row is the card's own control — same button, same words, same fallback. */
export function IntakeRowItem({ row }: { row: IntakeRow }) {
  return (
    <li className="border-border hover:bg-muted/20 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm transition-colors">
      <span className="font-medium">{row.title ?? row.name}</span>
      {row.title ? <span className="text-muted-foreground font-mono text-xs">{row.name}</span> : null}
      <span className="text-muted-foreground text-xs tabular-nums">{row.recorded}</span>
      <span className="text-muted-foreground text-xs tabular-nums">{row.plies > 0 ? `${row.plies} Halbzüge` : "—"}</span>
      <ChainActions lastJob={row.failed} name={row.name} state={row.chain} />
      <Link className="text-muted-foreground ml-auto shrink-0 text-xs hover:underline hover:underline-offset-4" href={`/#${row.name}`}>
        Karte →
      </Link>
    </li>
  );
}
