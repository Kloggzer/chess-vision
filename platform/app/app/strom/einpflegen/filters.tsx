import Link from "next/link";
import { SEGMENTS, segment } from "@/components/segmented";
import { failedOn, INTAKE_GROUPS, type IntakeGroup, type IntakeGroupKey } from "@/lib/chain/intake";

/** The filter lives in the URL and nowhere else: every step is a plain link, so a filtered view is
 *  shareable, survives a reload, and costs neither client state nor a `Suspense` boundary. */
function href(keys: readonly IntakeGroupKey[], failed: boolean): string {
  const params = new URLSearchParams();
  if (keys.length > 0 && keys.length < INTAKE_GROUPS.length) params.set("nur", keys.join(","));
  if (failed) params.set("gescheitert", "1");
  const query = params.toString();
  return query ? `/strom/einpflegen?${query}` : "/strom/einpflegen";
}

/** One press on a step shows that step alone; pressing the shown step again shows everything. */
function toggle(only: readonly IntakeGroupKey[], key: IntakeGroupKey): IntakeGroupKey[] {
  const alone = only.length === 1 && only[0] === key;
  return alone ? [...INTAKE_GROUPS] : [key];
}

/**
 * The chain as a stepper: every step visible in order with its count, the occupied ones dark, the
 * empty ones quiet — and each one is the filter. Chosen over per-step columns (design 2026-09-06):
 * seven columns on 1024 px leave a card 130 px, and a failure then needs a second click to be read.
 */
export function IntakeStepper({
  groups,
  only,
  failedOnly,
  failed,
}: {
  groups: readonly IntakeGroup[];
  only: readonly IntakeGroupKey[];
  failedOnly: boolean;
  failed: number;
}) {
  const all = only.length === INTAKE_GROUPS.length;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <nav className={`${SEGMENTS} flex-1`} aria-label="Kette">
        {groups.map((group, i) => {
          const active = !all && only.includes(group.key);
          const occupied = group.rows.length > 0;
          const failedHere = group.rows.filter(failedOn).length;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`${segment(active, occupied, i === 0)} flex flex-1 flex-col gap-0.5`}
              href={href(toggle(only, group.key), failedOnly)}
              key={group.key}
              title={group.what}
            >
              <span className={`truncate text-xs ${occupied ? "font-medium" : ""}`}>{group.label}</span>
              <span className="flex items-baseline gap-1.5">
                <span className={`text-lg font-semibold tabular-nums ${occupied ? "" : "text-muted-foreground/60"}`}>{group.rows.length}</span>
                {failedHere > 0 ? <span className="text-destructive text-xs tabular-nums">{failedHere} gescheitert</span> : null}
              </span>
            </Link>
          );
        })}
      </nav>
      <Link
        aria-current={failedOnly ? "page" : undefined}
        className={`border-border inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs no-underline max-sm:h-11 ${
          failedOnly ? "border-destructive text-destructive font-medium" : "text-muted-foreground hover:bg-accent/50"
        }`}
        href={href(only, !failedOnly)}
      >
        nur Gescheiterte <span className="tabular-nums">{failed}</span>
      </Link>
    </div>
  );
}
