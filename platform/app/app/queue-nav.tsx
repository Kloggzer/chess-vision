import Link from "next/link";

/**
 * Counts passed in, never fetched: every page already read the rows.
 * Streams carry same counts as lists (CONCEPT.md §9.2).
 */
export type QueueCounts = { confirm: number; relabel: number };

const LINKS = [
  { href: "/", label: "Partien", key: "home", count: null },
  { href: "/strom/zuege", label: "züge", key: "zuege", count: "confirm" },
  { href: "/strom/labeln", label: "labeln", key: "labeln", count: "relabel" },
  { href: "/confirm", label: "confirm", key: "confirm", count: "confirm" },
  { href: "/relabel", label: "labeling", key: "relabel", count: "relabel" },
  { href: "/corpus", label: "Korpus", key: "corpus", count: null },
  { href: "/transfers", label: "transfers", key: "transfers", count: null },
] as const;

/** [here] may name a page that is not in the list (Reparatur) — then nothing is marked current. */
export function QueueNav({ counts, here }: { counts: QueueCounts; here: (typeof LINKS)[number]["key"] | "reparatur" }) {
  return (
    <nav className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {LINKS.map((link) => {
        const n = link.count ? counts[link.count] : null;
        return (
          <Link
            className={link.key === here ? "text-foreground" : "underline underline-offset-4"}
            href={link.href}
            key={link.key}
          >
            {link.label}
            {n !== null && n > 0 ? <span className="ml-1 tabular-nums">({n})</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
