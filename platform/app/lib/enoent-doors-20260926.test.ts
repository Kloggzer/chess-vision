/** Nur ENOENT heisst "nicht da": ein anderer Lesefehler wird nie zum leeren Vorzustand. */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { appendRows } from "@/lib/atomic";
import { packInputs } from "@/lib/chain/pack";
import { targetDir } from "@/lib/ingest/ingest";
import { readJsonl } from "@/lib/jsonl";
import { loadLabelStream } from "@/lib/label/label-stream";
import { loadVerifyStream } from "@/lib/label/verify";
import { gameDir, listGames } from "@/lib/session-store/recordings";
import { phoneSessionSeconds } from "@/lib/session-store/stored";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const busy = vi.hoisted(() => ({ file: null as string | null }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei. Einmal, wie ein Virenscanner.
    readFile: (file: string, ...rest: unknown[]) => {
      if (busy.file !== null && path.resolve(String(file)) === path.resolve(busy.file)) {
        busy.file = null;
        return Promise.reject(Object.assign(new Error(`EBUSY: ${file}`), { code: "EBUSY" }));
      }
      return (real.readFile as (...a: unknown[]) => unknown)(file, ...rest);
    },
  };
});

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("enoent-doors");
  busy.file = null;
});

test("appendRows: ein EBUSY beim Lesen klebt die Zeile nicht an den halben Schwanz", async () => {
  const file = path.join(root, "rows.jsonl");
  await writeFile(file, '{"a":1}\n{"a":', "utf8");
  busy.file = file;

  await expect(appendRows(file, [{ a: 2 }])).rejects.toMatchObject({ code: "EBUSY" });
  expect(readJsonl(await readFile(file, "utf8")).corrupt).toBe(0);
});

test("appendRows: eine fehlende Datei ist der leere Vorzustand", async () => {
  const file = path.join(root, "neu.jsonl");
  expect(await appendRows(file, [{ a: 1 }])).toBe(1);
  expect(await readFile(file, "utf8")).toBe('{"a":1}\n');
});

async function packRecording(): Promise<string> {
  const session = path.join(targetDir("g"), "sessions", "20260923-100000");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "video.mp4"), "x");
  return path.join(targetDir("g"), "games");
}

test("packInputs: fehlendes games/ ist der Grund, eine Datei an seiner Stelle wirft", async () => {
  const games = await packRecording();
  expect(await packInputs("g")).toEqual({ reason: "no games/ in the transfer — nothing states what was played" });
  await writeFile(games, "");
  await expect(packInputs("g")).rejects.toMatchObject({ code: "ENOTDIR" });
});

test("listGames: eine fehlende Wurzel ist ein frisches Projekt", async () => {
  expect(await listGames()).toEqual([]);
});

test("phoneSessionSeconds: fehlendes sessions/ ist keine Dauer, eine Datei dort wirft", async () => {
  const files = path.join(gameDir("g"), "files");
  await mkdir(files, { recursive: true });
  expect(await phoneSessionSeconds("g")).toBeNull();
  await writeFile(path.join(files, "sessions"), "");
  await expect(phoneSessionSeconds("g")).rejects.toMatchObject({ code: "ENOTDIR" });
});

async function logIsADirectory(): Promise<void> {
  const dir = await writeSession({ root, name: "g", rows: [{ frame: 10, dirty: true }] });
  await writeFile(path.join(dir, "matte.jsonl"), JSON.stringify({ frame: "000010", coverage: { a1: 0.9 }, concepts: {} }) + "\n");
  await rm(path.join(dir, "log.jsonl"));
  await mkdir(path.join(dir, "log.jsonl"));
}

test("verify: ein Verzeichnis statt log.jsonl ist kein 'nicht exportiert'", async () => {
  await logIsADirectory();
  await expect(loadVerifyStream()).rejects.toMatchObject({ code: "EISDIR" });
});

test("label-stream: ohne Export bleibt die Aufnahme still, ein Verzeichnis statt log.jsonl wirft", async () => {
  await mkdir(gameDir("g"), { recursive: true });
  expect((await loadLabelStream()).cells).toEqual([]);
  await logIsADirectory();
  await expect(loadLabelStream()).rejects.toMatchObject({ code: "EISDIR" });
});
