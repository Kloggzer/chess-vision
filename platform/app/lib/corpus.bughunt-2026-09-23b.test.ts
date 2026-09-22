/**
 * Die Vorauswahl der Korpus-Seite las jeden `stat`-Fehler auf `split.json` als mtime 0 — ein
 * EACCES waehlte still einen aelteren Datensatz vor.
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

test("ein EACCES auf split.json waehlt keinen anderen Datensatz vor", async () => {
  await tempDataRoot("corpusnewest");
  const { datasetDir, newestDataset } = await import("@/lib/corpus");
  for (const name of ["alt", "neu"]) {
    await mkdir(datasetDir(name), { recursive: true });
    await writeFile(path.join(datasetDir(name), "split.json"), "{}", "utf8");
  }
  fail.on = (op, file) => (op === "stat" && file === path.join(datasetDir("neu"), "split.json") ? "EACCES" : null);
  await expect(newestDataset([{ name: "alt" }, { name: "neu" }])).rejects.toThrow(/EACCES/);
});
