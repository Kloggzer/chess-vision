/**
 * `sizeOf` gab bei JEDEM Fehler `-1`: ein EACCES auf der gelandeten Datei hiess „nichts da", und
 * das Handy lud ein Gigabyte neu hoch. Dieselbe Zahl beantwortete auch „existiert das Ziel?".
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
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

const NAME = "2026-08-13-19-34-23";
const FILE = { path: "sessions/20260813-193423/video.mp4", bytes: 4 };
const manifest = { sessionId: "20260813-193423", files: [FILE] };

test("ein EACCES auf der gelandeten Datei ist kein „noch nichts hochgeladen\"", async () => {
  const root = await tempDataRoot("ingestsize");
  const landed = path.join(root, "recordings", NAME, "files", FILE.path);
  await mkdir(path.dirname(landed), { recursive: true });
  await writeFile(landed, "abcd");
  fail.on = (file) => file === landed;
  await expect((await import("@/lib/ingest")).declare(manifest)).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf dem Ziel ist kein „Ziel frei\"", async () => {
  const root = await tempDataRoot("ingestexists");
  const staging = path.join(root, "inbox", NAME);
  await mkdir(path.join(staging, path.dirname(FILE.path)), { recursive: true });
  await writeFile(path.join(staging, "manifest.json"), JSON.stringify(manifest));
  await writeFile(path.join(staging, FILE.path + ".partial"), "abcd");
  const target = path.join(root, "recordings", NAME, "files");
  fail.on = (file) => file === target;
  await expect((await import("@/lib/ingest")).complete(NAME)).rejects.toThrow(/EACCES/);
});

test("ein EACCES auf dem `.partial` nimmt den Transfer nicht aus „in Flug\"", async () => {
  const root = await tempDataRoot("ingestpending");
  const staging = path.join(root, "inbox", NAME);
  await mkdir(path.join(staging, path.dirname(FILE.path)), { recursive: true });
  await writeFile(path.join(staging, "manifest.json"), JSON.stringify(manifest));
  await writeFile(path.join(staging, FILE.path + ".partial"), "ab");
  fail.on = (file) => file.endsWith(".partial");
  await expect((await import("@/lib/ingest")).pending()).rejects.toThrow(/EACCES/);
});

test("fehlt das `.partial`, beginnt der Transfer bei 0", async () => {
  await tempDataRoot("ingestfresh");
  expect((await (await import("@/lib/ingest")).declare(manifest)).have).toEqual({ [FILE.path]: 0 });
});
