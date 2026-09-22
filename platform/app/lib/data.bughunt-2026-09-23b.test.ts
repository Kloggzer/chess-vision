/**
 * `requireRecording` las jeden `stat`-Fehler als „keine Aufnahme auf dieser Maschine" — ein
 * EACCES schickte den Menschen nach einer Aufnahme suchen, die daliegt.
 */
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readFile: (f: string, ...r: unknown[]) => hop("readFile", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
    open: (f: string, ...r: unknown[]) => hop("open", f, r),
  };
});

beforeEach(() => {
  fail.on = null;
});

test("ein EACCES am Aufnahmeverzeichnis ist keine fehlende Aufnahme", async () => {
  const dir = path.join(await tempDataRoot("requirerec"), "recordings");
  fail.on = (op, file) => (op === "stat" && file === dir ? "EACCES" : null);
  await expect((await import("@/lib/data")).requireRecording(dir, "g")).rejects.toThrow(/EACCES/);
});

test("eine wirklich fehlende Aufnahme sagt es weiter", async () => {
  const dir = path.join(await tempDataRoot("requiregone"), "nirgends");
  await expect((await import("@/lib/data")).requireRecording(dir, "g")).rejects.toThrow(/keine Aufnahme/);
});
