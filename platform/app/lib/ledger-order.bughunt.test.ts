/**
 * Die Ledger-Zeilen liefen sich gegenseitig ueber den Haufen. `appendRows` hat vor dem Anhaengen
 * einen `await` (Schwanz pruefen), und `runChesslab` schickt seine `running`-Zeile mit
 * `void record(running)` los, ohne sie abzuwarten — die `done`-Zeile danach konnte also VORHER
 * landen. Nach einem Neustart liest `restarted()` die letzte Zeile und macht aus dem fertigen
 * Schritt "the server restarted while this job was running".
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { inboxDir } from "@/lib/ingest";
import { tempDataRoot } from "@/lib/test-fixtures";

/** Der FRUEHER abgeschickte Schreiber wird aufgehalten, bis der spaetere fertig ist. Ohne Riegel
 *  kommt der spaetere durch und kehrt die Reihenfolge um; mit Riegel wartet er auf uns, und die
 *  Frist loest die Umklammerung auf, statt den Test haengen zu lassen. */
const gate = vi.hoisted(() => {
  let done!: () => void;
  const late = new Promise<void>((r) => (done = r));
  return { late, done };
});

/** Der kurze Halt ist der zuerst abgeschickte, der lange der zweite — `holdExport(name, ms)`. */
const isEarly = (row: unknown) =>
  Date.parse(String((row as { notBefore?: string }).notBefore)) - Date.now() < 60_000;

vi.mock("@/lib/atomic", async (original) => {
  const real = await original<typeof import("@/lib/atomic")>();
  return {
    ...real,
    appendRows: async (file: string, rows: unknown[]) => {
      if (isEarly(rows[0])) await Promise.race([gate.late, new Promise((r) => setTimeout(r, 300))]);
      const n = await real.appendRows(file, rows);
      if (!isEarly(rows[0])) gate.done();
      return n;
    },
  };
});

const { holdExport } = await import("@/lib/jobs");

beforeEach(async () => {
  await tempDataRoot("ledger-order");
});

test("die zuletzt abgeschickte Zeile steht auch zuletzt in jobs.jsonl", async () => {
  const name = "2026-09-21-08-00-00";
  const early = holdExport(name, 1_000);
  const late = holdExport(name, 600_000);
  const [, second] = await Promise.all([early, late]);

  const lines = (await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8")).trim().split("\n");
  expect(lines).toHaveLength(2);
  expect(JSON.parse(lines[1]).notBefore).toBe(second.notBefore);
});
