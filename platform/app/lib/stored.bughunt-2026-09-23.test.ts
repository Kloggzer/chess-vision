/**
 * `loadStored` las das Telefon-Log mit `jsonlRows`, das die Diagnose wegwirft: eine kaputte Zeile
 * MITTENDRIN verschwand samt ihrem Label. Die halbe LETZTE bleibt verziehen, ein Lesefehler nicht.
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
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    readFile: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.readFile as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

const row = (stem: string) =>
  JSON.stringify({ frame: `frames/${stem}.jpg`, ply: 1, fen: "8/8/8/8/8/8/8/8", corners: [[0, 0], [1, 0], [1, 1], [0, 1]] });

async function log(prefix: string, text: string): Promise<void> {
  const session = path.join(await tempDataRoot(prefix), "recordings", "g", "files", "sessions", "s1");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "log.jsonl"), text, "utf8");
}

const sessions = async () => (await import("@/lib/stored")).storedSessions("g");

test("eine kaputte Zeile MITTENDRIN wirft, statt ihr Label still zu verlieren", async () => {
  await log("storedmid", `${row("0000")}\n{"frame": "fra\n${row("0002")}\n`);
  await expect(sessions()).rejects.toThrow(/beschaedigte Zeile/);
});

test("die halbe LETZTE Zeile bleibt verziehen", async () => {
  await log("storedtail", `${row("0000")}\n${row("0001")}\n{"frame": "fra`);
  expect((await sessions())[0].rows.map((r) => r.stem)).toEqual(["0000", "0001"]);
});

test("ein Lesefehler am Log wird durchgereicht", async () => {
  await log("storedread", `${row("0000")}\n`);
  fail.on = (file) => file.endsWith("log.jsonl");
  await expect(sessions()).rejects.toThrow(/EACCES/);
});
