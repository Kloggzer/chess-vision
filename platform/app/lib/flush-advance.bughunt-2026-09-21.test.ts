import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * `flush` faengt den fehlgeschlagenen POST selbst ab. Solange es nichts zurueckgibt, kann keine
 * Lane den Unterschied sehen: die Seite galt als geschrieben, die Zellen verliessen den Strom und
 * `markCommitted` warf die gemalte Historie weg — ohne eine einzige Zeile auf der Platte.
 */
const DIR = ["app", "strom", "labeln"];
const LANES = ["cell-lane.tsx", "board-lane.tsx", "mobile-sort.tsx"];

const read = (file: string) => readFile(path.join(process.cwd(), ...DIR, file), "utf8");

test("Flush sagt, ob geschrieben wurde", async () => {
  const stream = await read("stream.tsx");
  expect(stream).toMatch(/export type Flush = \([\s\S]*?\) => Promise<boolean>;/);
  // Der `catch` meldet den Fehlschlag, statt ihn nur anzuzeigen.
  expect(stream.slice(stream.indexOf("const flush = useCallback"))).toMatch(/fail\(error\);\s*return false;/);
});

test("keine Lane geht weiter, bevor der Flush den Schreibvorgang bestaetigt hat", async () => {
  const offences: string[] = [];
  for (const lane of LANES) {
    const source = await read(lane);
    const parts = source.split("onFlush(");
    expect(parts.length, `${lane} ruft onFlush nicht mehr`).toBeGreaterThan(1);
    for (const before of parts.slice(0, -1)) {
      const tail = before.trimEnd();
      // Zwei Formen halten denselben Riegel: direkt geprueft, oder als Schreiber in
      // `pageWritten([…])`, wo `if (!written)` fuer ALLE Schreiber der Seite haelt.
      const guarded = tail.endsWith("if (!(await")
        || (tail.endsWith("() =>") && before.includes("pageWritten([") && source.includes("if (!written) return;"));
      if (!guarded) offences.push(`${lane}: onFlush ungeprueft`);
    }
  }
  expect([...new Set(offences)]).toEqual([]);
});
