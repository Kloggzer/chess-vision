/**
 * Der geschaerfte Mess-Tueren-Erkenner fand drei weitere Stellen in `chain.ts`: der Log-Stempel
 * hiess bei jedem Fehler „kein Log", und `referenceOrigin` machte aus einem EACCES "none" bzw.
 * "outside" — ein PGN des Handys galt damit als menschliche Referenz.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

/** Die Zeile des AUFRUFERS: dieselbe Datei fragen auch andere Module, und nur einer ist gemeint. */
const caller = () => (new Error().stack ?? "").split("\n").slice(1).find((l) => !l.includes("bughunt-2026-09-23b")) ?? "";

async function bundle(prefix: string): Promise<string> {
  const dir = path.join(await tempDataRoot(prefix), "recordings", "g");
  await mkdir(path.join(dir, "files", "games"), { recursive: true });
  await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 *\n", "utf8");
  await writeFile(path.join(dir, "files", "games", "a.pgn"), "1. e4 e5 *\n", "utf8");
  return dir;
}

const origin = async () => (await import("@/lib/chain")).referenceOrigin("g");

test("ein EACCES auf reference.pgn ist nicht „keine Referenz\"", async () => {
  await bundle("originread");
  fail.on = (op, file) => (op === "readFile" && file.endsWith("reference.pgn") ? "EACCES" : null);
  await expect(origin()).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf files/games macht das Handy-PGN nicht zur menschlichen Referenz", async () => {
  await bundle("origingames");
  fail.on = (op, file) => (op === "readdir" && file.endsWith(path.join("files", "games")) ? "EACCES" : null);
  await expect(origin()).rejects.toThrow(/EACCES/);
});

test("ohne reference.pgn und ohne games/ bleiben die Antworten, was sie waren", async () => {
  const dir = path.join(await tempDataRoot("originnone"), "recordings", "g");
  await mkdir(dir, { recursive: true });
  expect(await origin()).toBe("none");
  await writeFile(path.join(dir, "reference.pgn"), "1. e4 *\n", "utf8");
  expect(await origin()).toBe("outside");
});

test("ein EACCES auf den Stempel von log.jsonl ist kein fehlender Export", async () => {
  await writeSession({ root: await tempDataRoot("chainstamp"), rows: [{ frame: 1 }] });
  fail.on = (op, file) =>
    op === "stat" && file.endsWith("log.jsonl") && caller().includes("stampOf") ? "EACCES" : null;
  await expect((await import("@/lib/chain")).chainState("g")).rejects.toThrow(/EACCES/);
});
