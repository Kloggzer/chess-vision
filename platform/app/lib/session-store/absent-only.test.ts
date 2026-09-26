import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { ledgerChanges } from "@/lib/session-store/corrections";
import { archivedAt, loadMeta } from "@/lib/session-store/meta";
import { frameReviews, reviewNotesPath } from "@/lib/session-store/review-notes";
import { readUseless } from "@/lib/session-store/useless";
import { gameDir, recordingFile } from "@/lib/session-store/recordings";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ file: null as string | null }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
    readFile: (file: string, ...rest: unknown[]) =>
      fail.file !== null && path.resolve(String(file)) === path.resolve(fail.file)
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.readFile as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

const NAME = "2026-08-14-09-23-19";

beforeEach(async () => {
  await tempDataRoot("absent-only");
  await mkdir(gameDir(NAME), { recursive: true });
  fail.file = null;
});

type Reader = { what: string; file: () => string; read: () => Promise<unknown>; empty: unknown };

const READERS: Reader[] = [
  { what: "loadMeta", file: () => path.join(gameDir(NAME), "ui-meta.json"), read: () => loadMeta(NAME), empty: {} },
  { what: "archivedAt", file: () => recordingFile(NAME, "session"), read: () => archivedAt(NAME), empty: null },
  { what: "readUseless", file: () => path.join(gameDir(NAME), "useless.json"), read: () => readUseless(NAME), empty: null },
  { what: "ledgerChanges", file: () => path.join(gameDir(NAME), "corrections.jsonl"),
    read: () => ledgerChanges(NAME, "corrections"), empty: [] },
  { what: "frameReviews", file: reviewNotesPath, read: () => frameReviews(`rg-${NAME}`), empty: new Map() },
];

test.each(READERS)("$what: a missing file is empty", async ({ read, empty }) => {
  expect(await read()).toEqual(empty);
});

test.each(READERS)("$what: a directory in its place throws EISDIR", async ({ file, read }) => {
  await mkdir(file(), { recursive: true });
  await expect(read()).rejects.toMatchObject({ code: "EISDIR" });
});

test.each(READERS)("$what: EACCES is passed on, not read as empty", async ({ file, read }) => {
  fail.file = file();
  await expect(read()).rejects.toMatchObject({ code: "EACCES" });
});

test.each(READERS.filter((r) => r.what === "loadMeta" || r.what === "readUseless"))(
  "$what: broken JSON throws",
  async ({ file, read }) => {
    await writeFile(file(), "{kaputt");
    await expect(read()).rejects.toThrow(SyntaxError);
  },
);
