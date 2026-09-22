/**
 * Zwei Stellen in `progress.ts` machten aus jedem Fehler „nichts da": ein EACCES auf `sessions/`
 * hiess „Dauer unbekannt", ein EACCES auf den Log zeigte einen leeren Schwanz bei null Bytes.
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

test("ein EACCES auf sessions/ ist keine unbekannte Dauer", async () => {
  const root = await tempDataRoot("progsessions");
  await mkdir(path.join(root, "recordings", "g", "files", "sessions"), { recursive: true });
  fail.on = (op, file) => (op === "readdir" && file.endsWith(path.join("files", "sessions")) ? "EACCES" : null);
  await expect((await import("@/lib/progress")).progressOf("g", undefined)).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf den Log ist kein leerer Log", async () => {
  const root = await tempDataRoot("progtail");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  const log = path.join(root, "job.log");
  await writeFile(log, "$ run\n", "utf8");
  fail.on = (op, file) => (op === "stat" && file === log ? "EACCES" : null);
  await expect((await import("@/lib/progress")).progressOf("g", log)).rejects.toThrow(/EACCES/);
});
