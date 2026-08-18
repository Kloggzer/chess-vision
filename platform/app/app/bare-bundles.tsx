import Link from "next/link";
import type { QueueRow } from "@/lib/queues";
import { UselessButton } from "./useless-button";

/**
 * The bundles with no recording and no candidate, as ONE row that opens.
 *
 * Eighteen identical cards saying "nothing to label" are a wall, not information. Collapsed they
 * are a number; opened, each one states what it DOES carry (frames, a PGN) so the verdict is a
 * judgement and not a guess — and the verdict itself is one click away, per row.
 */
export function BareBundles({ rows }: { rows: QueueRow[] }) {
  if (rows.length === 0) return null;
  return (
    <details className="border-border rounded-lg border px-3 py-1.5 text-sm">
      <summary className="text-muted-foreground cursor-pointer">
        {rows.length} Bundles ohne Video — anzeigen
      </summary>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => {
          return (
            <li className="flex flex-wrap items-center gap-x-3 gap-y-1" key={row.name}>
              <Link className="font-mono text-xs underline underline-offset-4" href={`/confirm/${row.name}`}>
                {row.name}
              </Link>
              {row.title ? <span>{row.title}</span> : null}
              <span className="text-muted-foreground text-xs">
                {row.frames > 0 ? `${row.frames} Frames` : "keine Frames"} ·{" "}
                {row.chain.hasReference
                  ? "reference.pgn ✓"
                  : row.chain.offeredPgn
                    ? "Phone-PGN, nicht übernommen"
                    : "kein PGN"}
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                <UselessButton flagged={false} name={row.name} />
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
