/**
 * Der Cache-Schluessel der Urteils-Ledger war `"none"` fuer JEDEN `stat`-Fehler. Nach dem ersten
 * Urteil traf ein EMFILE den gecachten Stand von davor: die Urteile eines Menschen galten als nie gefaellt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EMFILE: ${file}`), { code: "EMFILE" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

const verdict = (extra: Record<string, unknown>) => JSON.stringify({ session_id: "rg-g", ts: "t", ...extra }) + "\n";

test("corrections: ein EMFILE nach dem ersten Urteil liefert nicht den leeren Stand von davor", async () => {
  const game = path.join(await tempDataRoot("corrstamp"), "recordings", "g");
  await mkdir(game, { recursive: true });
  const { decidedKeys } = await import("@/lib/corrections");
  expect((await decidedKeys("g")).size).toBe(0);
  const file = path.join(game, "corrections.jsonl");
  await writeFile(file, verdict({ frame: "000001", square: "e4", label: "wP" }), "utf8");
  fail.on = (f) => f === file;
  await expect(decidedKeys("g")).rejects.toThrow(/EMFILE/);
});
