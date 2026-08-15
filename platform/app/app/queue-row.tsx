import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { QueueRow } from "@/lib/queues";
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
    <li className="border-border flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-sm">
      <Link className="font-medium underline underline-offset-4" href={href}>
        {row.title ?? row.name}
      </Link>
      {row.title ? <span className="text-muted-foreground font-mono text-xs">{row.name}</span> : null}
      <span className="text-muted-foreground">
        {row.plies} Halbzüge · {row.chain.hasReference ? "reference.pgn ✓" : "kein PGN"}
      </span>
      {stats ? (
        <span className="text-muted-foreground text-xs" title={stats.title}>
          {stats.text}
        </span>
      ) : null}
      {row.chain.offeredPgn ? <Badge variant="secondary">Phone-PGN da</Badge> : null}
      <span className="text-muted-foreground ml-auto text-xs">
        <UselessButton flagged={row.chain.useless !== null} name={row.name} />
      </span>
    </li>
  );
}
