/**
 * `recordingSegments` endete an jedem `stat`-Fehler, als fehle das Segment: ein EACCES auf
 * `video-001.mp4` kuerzte die Aufnahme still auf ihren Kopf.
 */
import { writeFile } from "node:fs/promises";
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

test("ein EACCES auf ein Segment kuerzt die Aufnahme nicht", async () => {
  const root = await tempDataRoot("mp4seg");
  const head = path.join(root, "video.mp4");
  await writeFile(head, "x");
  await writeFile(path.join(root, "video-001.mp4"), "x");
  fail.on = (op, file) => (op === "stat" && file.endsWith("video-001.mp4") ? "EACCES" : null);
  await expect((await import("@/lib/mp4")).firstUnfinalized(head)).rejects.toThrow(/EACCES/);
});
