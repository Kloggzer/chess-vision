/**
 * Zwei Stellen in `jobs.ts` beantworteten jeden Fehler als „nicht da": ein EACCES auf `games/`
 * hiess „kein Spielstand im Transfer", ein EACCES auf den Job-Log zeigte einen leeren Schwanz.
 */
import { mkdir, writeFile } from "node:fs/promises";
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

test("ein EACCES auf games/ ist nicht „kein Spielstand im Transfer\"", async () => {
  await tempDataRoot("jobsgames");
  const { targetDir } = await import("@/lib/ingest");
  const { packInputs } = await import("@/lib/jobs");
  const session = path.join(targetDir("g"), "sessions", "20260923-100000");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "video.mp4"), "x");
  fail.on = (op, file) => (op === "readdir" && file === path.join(targetDir("g"), "games") ? "EACCES" : null);
  await expect(packInputs("g")).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf den Job-Log ist kein leerer Log", async () => {
  const log = path.join(await tempDataRoot("jobstail"), "job.log");
  await writeFile(log, "zeile\n", "utf8");
  fail.on = (op, file) => (op === "stat" && file === log ? "EACCES" : null);
  const { jobLogTail } = await import("@/lib/jobs");
  await expect(jobLogTail({ log } as Parameters<typeof jobLogTail>[0])).rejects.toThrow(/EACCES/);
});
