import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * The `actionsRef` effect of every lane runs ONCE (`[actionsRef]`), so anything it closes over is
 * frozen at the first render. `board-lane` and `frame-lane` therefore reach render state only
 * through their per-render ref; `cell-lane` calls `put`, which closes over `slice` — on page two
 * `u` (UNUSABLE_KEY) then keys `unusable-cells.jsonl` off page one's cell.
 */
const LANES = ["cell-lane.tsx", "board-lane.tsx", "frame-lane.tsx"] as const;
const REF = /\b(?:now|current|nowFlood)\.current\b/g;
/** Stable by React contract, plus the keywords a call-shaped regex also catches. */
const STABLE = /^(set[A-Z]|use[A-Z]|if$|for$|while$|switch$|return$|void$|catch$)/;

/** The body of `actionsRef.current = { … };` inside the once-only effect. */
function actionsBody(source: string): string {
  const from = source.indexOf("actionsRef.current = {");
  const to = source.indexOf("}, [actionsRef]);", from);
  expect(from, "no once-only actionsRef effect found").toBeGreaterThan(-1);
  expect(to, "the actionsRef effect is not keyed on [actionsRef] alone").toBeGreaterThan(from);
  return source.slice(from, to);
}

/** `const { a: x, b } = now.current;` — those names ARE the fresh values, not stale closures. */
function fromRef(body: string): Set<string> {
  const out = new Set<string>();
  for (const [, clause] of body.matchAll(/const\s*\{([^}]*)\}\s*=\s*\w+\.current/g)) {
    for (const part of clause.split(",")) out.add(part.split(":").pop()!.trim());
  }
  return out;
}

test("a lane's one-shot actionsRef handlers touch render state only through their ref", async () => {
  const offences: string[] = [];
  for (const file of LANES) {
    const source = await readFile(path.join(process.cwd(), "app", "strom", "labeln", file), "utf8");
    const body = actionsBody(source);
    const fresh = fromRef(body);
    for (const [, name] of body.replace(REF, "REF").matchAll(/(?:^|[^.\w])([a-z]\w*)\s*\(/g)) {
      if (name === "REF" || fresh.has(name) || STABLE.test(name)) continue;
      offences.push(`${file}: ${name}() is a per-render closure captured once`);
    }
  }
  expect([...new Set(offences)]).toEqual([]);
});
