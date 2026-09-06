import Link from "next/link";
import { INTAKE_GROUPS, type IntakeGroup, type IntakeGroupKey } from "@/lib/intake";

/** The filter lives in the URL and nowhere else: every chip is a plain link, so a filtered view is
 *  shareable, survives a reload, and costs neither client state nor a `Suspense` boundary. */
function href(keys: readonly IntakeGroupKey[], failed: boolean): string {
  const params = new URLSearchParams();
  if (keys.length > 0 && keys.length < INTAKE_GROUPS.length) params.set("nur", keys.join(","));
  if (failed) params.set("gescheitert", "1");
  const query = params.toString();
  return query ? `/strom/einpflegen?${query}` : "/strom/einpflegen";
}

/** Unfiltered counts as "no key chosen", so the first press picks one instead of dropping one. */
function toggle(only: readonly IntakeGroupKey[], key: IntakeGroupKey): IntakeGroupKey[] {
  if (only.length === INTAKE_GROUPS.length) return [key];
  if (only.includes(key)) return only.filter((other) => other !== key);
  return INTAKE_GROUPS.filter((other) => only.includes(other) || other === key);
}

const CHIP = "border-border rounded-full border px-2.5 py-1 text-xs max-sm:h-11 max-sm:px-3 inline-flex items-center gap-1.5";

export function IntakeFilters({
  counts,
  only,
  failedOnly,
}: {
  counts: readonly IntakeGroup[];
  only: readonly IntakeGroupKey[];
  failedOnly: boolean;
}) {
  const all = only.length === INTAKE_GROUPS.length;
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      <Link
        aria-current={all && !failedOnly ? "page" : undefined}
        className={`${CHIP} ${all && !failedOnly ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
        href="/strom/einpflegen"
      >
        Alle
      </Link>
      {counts.map((group) => {
        const active = !all && only.includes(group.key);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`${CHIP} ${active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
            href={href(toggle(only, group.key), failedOnly)}
            key={group.key}
          >
            <span>{group.label}</span>
            <span className="tabular-nums">{group.rows.length}</span>
          </Link>
        );
      })}
      <Link
        aria-current={failedOnly ? "page" : undefined}
        className={`${CHIP} ${failedOnly ? "border-destructive text-destructive font-medium" : "text-muted-foreground hover:bg-accent/50"}`}
        href={href(only, !failedOnly)}
      >
        Gescheitert
      </Link>
    </nav>
  );
}
