/**
 * `frameSize` fing jeden Fehler und lieferte 720x816 — eine GERATENE Groesse, auf die die Karte
 * ihre Zugpfeile legt. Erreichbar ueber ein Rennen zwischen `readdir` und `stat`/`readFile`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((op: string, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (name: "stat" | "readFile", file: string, rest: unknown[]) => {
    const code = fail.on?.(name, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readFile: (file: string, ...rest: unknown[]) => hop("readFile", file, rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

async function fixture(prefix: string, bytes?: Buffer): Promise<void> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "recordings", "g", "frames");
  await mkdir(dir, { recursive: true });
  const board = await sharp({ create: { width: 928, height: 928, channels: 3, background: "#000" } }).webp().toBuffer();
  await writeFile(path.join(dir, "000001.webp"), board);
  await writeFile(path.join(dir, "000002.webp"), bytes ?? board);
}

const stems = async () => (await import("@/lib/data")).listFrameStems("g");

test("ein Frame, der nach `readdir` verschwindet, faellt weg statt 720x816 zu bekommen", async () => {
  await fixture("sizegone");
  fail.on = (op, file) => (op === "stat" && file.includes("000002") ? "ENOENT" : null);
  expect(await stems()).toEqual([{ stem: "000001", kind: "labeled", width: 928, height: 928 }]);
});

test("ein EACCES beim Lesen des Frames ist keine Groesse von 720x816", async () => {
  await fixture("sizeread");
  fail.on = (op, file) => (op === "readFile" && file.includes("000002") ? "EACCES" : null);
  await expect(stems()).rejects.toThrow(/EACCES/);
});

test("ein EACCES beim Suchen des Frames ist kein „Frame weg\"", async () => {
  await fixture("sizestat");
  fail.on = (op, file) => (op === "stat" && file.includes("000002") ? "EACCES" : null);
  await expect(stems()).rejects.toThrow(/EACCES/);
});

test("ein unlesbarer Bildkopf wirft statt zu raten", async () => {
  await fixture("sizejunk", Buffer.from("x"));
  await expect(stems()).rejects.toThrow();
});
