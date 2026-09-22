/**
 * `archivedAt` las jeden Fehler an `session.yaml` als „nie archiviert". Zwei Funktionen weiter
 * wird daraus die Label-Population: eine ausgemusterte Aufnahme (falsche FENs) stand wieder drin.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `catch` vorbei.
    readFile: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.readFile as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

async function game(prefix: string, yaml?: string): Promise<string> {
  const dir = path.join(await tempDataRoot(prefix), "recordings", "g");
  await mkdir(dir, { recursive: true });
  if (yaml !== undefined) await writeFile(path.join(dir, "session.yaml"), yaml, "utf8");
  return dir;
}

test("ein EACCES auf session.yaml ist kein „nie archiviert\"", async () => {
  await game("metaacc", "archived_at: '2026-08-30'\n");
  fail.on = (file) => file.endsWith("session.yaml");
  await expect((await import("@/lib/meta")).isArchived("g")).rejects.toThrow(/EACCES/);
});

test("ohne session.yaml ist die Aufnahme nicht archiviert", async () => {
  await game("metanone");
  expect(await (await import("@/lib/meta")).isArchived("g")).toBe(false);
});
