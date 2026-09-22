/**
 * `loadSession` schluesselte seinen Cache auf "none" bei JEDEM `stat`-Fehler — ein EMFILE auf
 * `candidate.json` traf den Stand von vor dem Kandidaten und schnitt mit alter Geometrie.
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

/** Die Zeile des AUFRUFERS hinter der Tuer: dieselbe Datei fragen auch andere Module. */
const caller = () => (new Error().stack ?? "").split("\n").slice(1).find((l) => !/bughunt-2026-09-23b|measurement/.test(l)) ?? "";

test("ein EMFILE auf candidate.json ist kein Schluessel „none\"", async () => {
  await writeSession({ root: await tempDataRoot("sessionkey"), rows: [{ frame: 1 }] });
  fail.on = (op, file) =>
    op === "stat" && file.endsWith("candidate.json") && caller().includes("session.ts") ? "EMFILE" : null;
  await expect((await import("@/lib/session")).loadSession("g")).rejects.toThrow(/EMFILE/);
});
