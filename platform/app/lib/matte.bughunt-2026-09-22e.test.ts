/**
 * `fixedAlphas` las jeden Fehler am `mattes/`-Verzeichnis als „niemand hat gemalt": eine
 * Korrektur, die da liegt, verschwindet damit aus `alphaState`, und die Lane zeigt SAMs Zahlen
 * als bestaetigt.
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

async function fixture(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "recordings", "g", "mattes");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "000001.fixed.webp"), "x", "utf8");
  return root;
}

const fixedAlphas = async () => (await import("@/lib/matte")).fixedAlphas("g");

test("ein I/O-Fehler am mattes-Verzeichnis ist kein „niemand hat gemalt\"", async () => {
  await fixture("mattedir");
  blowUpOn("mattes", "EACCES");
  await expect(fixedAlphas()).rejects.toThrow(/EACCES/);
  fail.on = null;
});

test("und ein fehlendes Verzeichnis bleibt eine leere Antwort", async () => {
  await tempDataRoot("matteleer");
  fail.on = null;
  expect((await fixedAlphas()).size).toBe(0);
});

test("die gemalte Korrektur wird weiter gefunden", async () => {
  await fixture("matteok");
  fail.on = null;
  expect([...(await fixedAlphas()).keys()]).toEqual(["000001"]);
});
