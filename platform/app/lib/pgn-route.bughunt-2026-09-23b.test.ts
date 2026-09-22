/**
 * `keepCopy` las jeden `stat`-Fehler auf einem Sicherungsnamen als „frei" — die Sicherung der
 * einzigen menschlichen Referenz stand damit auf einer Antwort, die niemand gegeben hat.
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

test("ein EACCES auf den Sicherungsnamen ersetzt das menschliche PGN nicht", async () => {
  const game = path.join(await tempDataRoot("pgnbackup"), "recordings", "g");
  await mkdir(game, { recursive: true });
  await writeFile(path.join(game, "reference.pgn"), "1. e4 e5 *\n", "utf8");
  fail.on = (op, file) => (op === "stat" && file.includes("reference.pgn.bak.") ? "EACCES" : null);
  const { POST } = await import("@/app/api/pgn/[name]/route");
  const res = await POST(new Request("http://local/api/pgn/g?replace=1", { method: "POST", body: "1. d4 d5 *\n" }), {
    params: Promise.resolve({ name: "g" }),
  });
  expect(res.status).not.toBe(200);
  expect(JSON.stringify(await res.json())).toMatch(/EACCES/);
});
