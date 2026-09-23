import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/** Der `actionsRef`-Effekt jeder Lane laeuft EINMAL; `put` in `cell-lane` fror so `slice` der ersten Seite ein. */
const LANES = ["cell-lane.tsx", "board-lane.tsx", "frame-lane.tsx"] as const;
const read = (file: string) => readFile(path.join(process.cwd(), "app", "strom", "labeln", file), "utf8");
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
    const source = await read(file);
    const body = actionsBody(source);
    const fresh = fromRef(body);
    for (const [, name] of body.replace(REF, "REF").matchAll(/(?:^|[^.\w])([a-z]\w*)\s*\(/g)) {
      if (name === "REF" || fresh.has(name) || STABLE.test(name)) continue;
      offences.push(`${file}: ${name}() is a per-render closure captured once`);
    }
  }
  expect([...new Set(offences)]).toEqual([]);
});

// `flush` faengt den gescheiterten POST selbst ab; ohne Rueckgabe galt die Seite als geschrieben (2026-09-21).
test("Flush sagt, ob geschrieben wurde", async () => {
  const stream = await read("stream.tsx");
  expect(await read("lane-types.ts")).toMatch(/export type Flush = \([\s\S]*?\) => Promise<boolean>;/);
  expect(stream.slice(stream.indexOf("const flush = useCallback"))).toMatch(/fail\(error\);\s*return false;/);
});

test("keine Lane geht weiter, bevor der Flush den Schreibvorgang bestaetigt hat", async () => {
  const offences: string[] = [];
  for (const lane of ["cell-lane.tsx", "board-lane.tsx", "mobile-sort.tsx"]) {
    const source = await read(lane);
    const parts = source.split("onFlush(");
    expect(parts.length, `${lane} ruft onFlush nicht mehr`).toBeGreaterThan(1);
    for (const before of parts.slice(0, -1)) {
      const tail = before.trimEnd();
      // Zwei Formen halten denselben Riegel: direkt geprueft, oder als Schreiber in `pageWritten([…])`.
      const guarded = tail.endsWith("if (!(await")
        || (tail.endsWith("() =>") && before.includes("pageWritten([") && source.includes("if (!written) return;"));
      if (!guarded) offences.push(`${lane}: onFlush ungeprueft`);
    }
  }
  expect([...new Set(offences)]).toEqual([]);
});
