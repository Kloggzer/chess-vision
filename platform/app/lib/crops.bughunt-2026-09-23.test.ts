/**
 * `cutSource` las jeden `stat`-Fehler am Brett als „fehlt — neu exportieren": ein EACCES schickte
 * den Menschen in einen Re-Export, den nichts reparieren kann.
 */
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

test("ein EACCES am Brett ist kein fehlendes Brett", async () => {
  await writeSession({ root: await tempDataRoot("cropsstat"), rows: [{ frame: 110 }] });
  fail.on = (file) => file.endsWith(path.join("boards", "000110.webp"));
  const { cellPng } = await import("@/lib/crops");
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/EACCES/);
});

test("ein wirklich fehlendes Brett sagt weiter, dass es fehlt", async () => {
  await writeSession({ root: await tempDataRoot("cropsgone"), rows: [{ frame: 110 }] });
  const { cellPng } = await import("@/lib/crops");
  await expect(cellPng("g", "000110", "e4", 64)).rejects.toThrow(/is missing/);
});
