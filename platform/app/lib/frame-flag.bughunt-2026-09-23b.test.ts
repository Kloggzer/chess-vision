/**
 * Die Suche nach einem freien Sicherungsnamen las jeden `stat`-Fehler als „frei". Ein EACCES ist
 * keine Antwort auf „gibt es diese Sicherung schon?".
 */
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

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

test("ein EACCES auf den Sicherungsnamen ist kein freier Name", async () => {
  await writeSession({ root: await tempDataRoot("flagbackup"), rows: [{ frame: 100 }] });
  fail.on = (op, file) => (op === "stat" && file.includes("log.jsonl.bak.") ? "EACCES" : null);
  await expect((await import("@/lib/session-store/frame-flag")).flagFrame("g", "000100", true)).rejects.toThrow(/EACCES/);
});
