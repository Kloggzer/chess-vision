/**
 * `listFrameStems` las jeden Fehler am Review-Verzeichnis als „keine Frames": die Seite zeigt
 * dann eine leere Aufnahme statt einer Stoerung, und der Mensch labelt woanders weiter.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: "stat" | "readdir", file: string, rest: unknown[]) => {
    try {
      fail.on?.(String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
  };
});

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (!file.includes(needle)) return;
    throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

async function fixture(prefix: string): Promise<void> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "recordings", "g", "frames");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "000001.webp"), "x", "utf8");
}

const stems = async () => (await import("@/lib/data")).listFrameStems("g");

test("ein I/O-Fehler am Review-Verzeichnis ist kein „keine Frames\"", async () => {
  await fixture("stemsdir");
  blowUpOn("review-extra", "EACCES");
  await expect(stems()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("ein fehlendes Verzeichnis bleibt leer, und die vorhandenen Stems kommen durch", async () => {
  await fixture("stemsok");
  fail.on = null;
  expect((await stems()).map((s) => s.stem)).toEqual(["000001"]);
});
