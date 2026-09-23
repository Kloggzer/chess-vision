"use client";

import Link from "next/link";
import { ChainActions } from "@/app/chain-actions";
import { ListRow } from "@/components/list-row";
import type { IntakeRow } from "@/lib/chain/intake";

/** Name, when, one fact, one control — the step's sentence lives once in the section, not here. */
export function IntakeRowItem({ row }: { row: IntakeRow }) {
  return (
    <ListRow>
      <span className="flex min-w-52 flex-col gap-0.5">
        <span className="font-medium">{row.title ?? row.name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {row.recorded}
          {row.title ? <span className="font-mono"> · {row.name}</span> : null}
          {row.plies > 0 ? ` · ${row.plies} Halbzüge` : ""}
        </span>
      </span>
      <ChainActions lastJob={row.job} name={row.name} showWhat={false} state={row.chain} />
      <Link className="text-muted-foreground ml-auto shrink-0 text-xs hover:underline hover:underline-offset-4" href={`/#${row.name}`}>
        Karte →
      </Link>
    </ListRow>
  );
}
