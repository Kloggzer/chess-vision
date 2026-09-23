import Link from "next/link";
import { Hint } from "@/app/page-title";
import { ListRow } from "@/components/list-row";
import { Badge } from "@/components/ui/badge";
import type { QueueRow } from "@/lib/chain/queues";
import { UselessButton } from "./useless-button";

/**
 * One line per waiting game: what it is, how much of it there is, and whether the machine can
 * check it. `kein PGN` is not a defect — the confirm screen then puts every ply to the human
 * instead of only the unmatched ones — but it IS the difference between minutes and an hour.
 */
export function QueueRowItem({
  row,
  href,
  stats,
}: {
  row: QueueRow;
  href: string;
  /** Already-read numbers WITH their unit, e.g. "278/480 Bretter" — never a bare count. */
  stats?: { text: string; title?: string };
}) {
  return (
    <ListRow>
      <Link className="font-medium hover:underline hover:underline-offset-4" href={href}>
        {row.title ?? row.name}
      </Link>
      {row.title ? <span className="text-muted-foreground font-mono text-xs">{row.name}</span> : null}
      <span className="text-muted-foreground text-xs tabular-nums">
        {row.plies} Halbzüge · {row.chain.hasReference ? "PGN ✓" : "kein PGN"}
      </span>
      {stats && stats.title ? (
        <Hint className="text-muted-foreground text-xs tabular-nums" tip={stats.title}>
          {stats.text}
        </Hint>
      ) : stats ? (
        <span className="text-muted-foreground text-xs tabular-nums">
          {stats.text}
        </span>
      ) : null}
      {row.chain.offeredPgn ? <Badge variant="secondary">Phone-PGN da</Badge> : null}
      <span className="text-muted-foreground ml-auto text-xs opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
        <UselessButton flagged={row.chain.useless !== null} name={row.name} />
      </span>
    </ListRow>
  );
}
