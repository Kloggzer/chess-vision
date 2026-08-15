import Link from "next/link";
import { Hint } from "@/app/page-title";
import type { QueueRow } from "@/lib/queues";
import type { StoredProgress } from "@/lib/stored";
import { UselessButton } from "./useless-button";

/**
 * The bundles with no recording and no candidate, as ONE row that opens.
 *
 * Eighteen identical cards saying "nothing to label" are a wall, not information. Collapsed they
 * are a number; opened, each one states what it DOES carry (frames, a PGN) so the verdict is a
 * judgement and not a guess — and the verdict itself is one click away, per row.
 */
export function BareBundles({
  rows,
  stored,
}: {
  rows: QueueRow[];
  /** Per bundle, how many of its stored boards the `Abnicken` lane already got a verdict on. */
  stored: Record<string, StoredProgress>;
}) {
  if (rows.length === 0) return null;
  const cleared = rows.filter((r) => {
    const p = stored[r.name];
    return p !== undefined && p.seen >= p.boards;
  }).length;
  return (
    <details className="border-border rounded-lg border px-3 py-1.5 text-sm">
      <summary className="text-muted-foreground cursor-pointer">
        {rows.length} Bundles ohne Video
        {cleared > 0 ? ` — ${cleared} abgenickt` : ""} — anzeigen
      </summary>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => {
          const progress = stored[row.name];
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
              {progress ? (
                <Hint tip="Stored-Bretter mit einem Urteil — öffnet die Lane Abnicken">
                  <Link
                    className="text-xs underline underline-offset-4 tabular-nums max-sm:h-11"
                    href="/strom/labeln/abnicken"
                  >
                    {progress.seen >= progress.boards
                      ? `${progress.boards}/${progress.boards} abgenickt ✓`
                      : `${progress.seen}/${progress.boards} Bretter gesehen`}
                  </Link>
                </Hint>
              ) : null}
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
