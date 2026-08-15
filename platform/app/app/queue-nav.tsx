import Link from "next/link";

/**
 * The four places this app has, with what waits in each.
 *
 * Counts are passed in, never fetched here: every page that renders this already read the rows it
 * would have to read again, and a nav that costs a second pass over `realgames/` is a nav that
 * makes each page slower for a number nobody asked to refresh.
 */
export type QueueCounts = { confirm: number; relabel: number };

const LINKS = [
  { href: "/", label: "Partien", key: "home" },
  { href: "/confirm", label: "confirm", key: "confirm" },
  { href: "/relabel", label: "labeling", key: "relabel" },
  { href: "/corpus", label: "Korpus", key: "corpus" },
  { href: "/transfers", label: "transfers", key: "transfers" },
] as const;

/** [here] may name a page that is not in the list (Reparatur) — then nothing is marked current. */
export function QueueNav({ counts, here }: { counts: QueueCounts; here: (typeof LINKS)[number]["key"] | "reparatur" }) {
  return (
    <nav className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      {LINKS.map((link) => {
        const n = link.key === "confirm" ? counts.confirm : link.key === "relabel" ? counts.relabel : null;
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
