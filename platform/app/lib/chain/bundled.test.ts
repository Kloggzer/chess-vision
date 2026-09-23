/** Die Startseite und der Strom fragen Python EINMAL je Seite, nicht einmal je Aufnahme (51 auf der Platte). */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const calls = vi.hoisted(() => ({ ops: [] as string[] }));
vi.mock("@/lib/py/worker", async (original) => {
  const real = await original<typeof import("@/lib/py/worker")>();
  return {
    ...real,
    pyCall: (op: string, ...rest: unknown[]) => {
      calls.ops.push(op);
      return (real.pyCall as (...a: unknown[]) => unknown)(op, ...rest);
    },
  };
});

async function threeGames(): Promise<void> {
  const root = await tempDataRoot("bundled");
  for (const name of ["2026-09-01-10-00-00", "2026-09-02-10-00-00", "2026-09-03-10-00-00"]) {
    await writeSession({ root, name, rows: [{ frame: 1 }, { frame: 2 }] });
    await mkdir(path.join(root, "recordings", name, "files"), { recursive: true });
  }
}

test("die Warteschlangen fragen die Kette aller Aufnahmen in EINER Anfrage", async () => {
  await threeGames();
  calls.ops = [];
  const { queueRows } = await import("@/lib/chain/queues");
  expect(await queueRows()).toHaveLength(3);
  expect(calls.ops.filter((op) => op === "chain_status")).toHaveLength(1);
});

test("der Labeln-Strom fragt Zulassung und Zellregel in EINER Anfrage", async () => {
  await threeGames();
  calls.ops = [];
  const { loadLabelStream } = await import("@/lib/label/label-stream");
  expect((await loadLabelStream()).sessions).toHaveLength(3);
  expect(calls.ops).toEqual(["admission"]);
  // Warm: wieder genau EINE Anfrage — Python antwortet dann aus seinem Stempel-Cache (`test_stream_admission.py`).
  await loadLabelStream();
  expect(calls.ops).toEqual(["admission", "admission"]);
});
