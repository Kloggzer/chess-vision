/**
 * `headerOf` schnitt jeden Fehler beim Oeffnen von `model-reads.jsonl` auf „nie gelesen" — die
 * Kette bot bei einem EACCES den schweren Lauf erneut an, statt die Stoerung zu melden.
 */
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((op: string, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (name: "stat" | "open", file: string, rest: unknown[]) => {
    const code = fail.on?.(name, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    open: (file: string, ...rest: unknown[]) => hop("open", file, rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

async function fixture(prefix: string): Promise<void> {
  const root = await tempDataRoot(prefix);
  await writeSession({ root, rows: [{ frame: 1 }, { frame: 2 }], candidate: { confirmed: true } });
}

const chainState = async () => (await import("@/lib/chain")).chainState("g");

test("ein EACCES auf model-reads.jsonl ist kein „nie gelesen\"", async () => {
  await fixture("chainreads");
  fail.on = (op, file) => (op === "open" && file.endsWith("model-reads.jsonl") ? "EACCES" : null);
  await expect(chainState()).rejects.toThrow(/EACCES/);
});

test("fehlt model-reads.jsonl, laeuft die Kette durch", async () => {
  await fixture("chainnone");
  expect((await chainState()).hasModelReads).toBe(false);
});
