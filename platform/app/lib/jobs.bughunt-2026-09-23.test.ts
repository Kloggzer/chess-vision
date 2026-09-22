/**
 * `jobs.exists` las jeden `stat`-Fehler als „nicht da". Ein EACCES auf `candidate.json` startete
 * damit das Label-Werkzeug, das die Datei samt menschlicher Bestaetigungen neu schreibt.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, onTestFinished, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `catch` vorbei.
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

beforeEach(() => {
  fail.on = null;
});

test("ein EACCES auf candidate.json startet das Label-Werkzeug nicht", async () => {
  const root = await tempDataRoot("jobsexists");
  const win = process.platform === "win32";
  const tool = path.join(root, win ? "desktop.bat" : "desktop");
  await writeFile(tool, win ? "@echo off\n" : "#!/bin/sh\n:\n", { mode: 0o755 });
  process.env.CHESSLAB_DESKTOP_BIN = tool;
  process.env.CHESSLAB_REPO_DIR = root;
  onTestFinished(() => {
    delete process.env.CHESSLAB_DESKTOP_BIN;
    delete process.env.CHESSLAB_REPO_DIR;
  });
  await mkdir(path.join(root, "android", "desktop"), { recursive: true });
  const name = "2026-09-23-10-00-00";
  const session = path.join(root, "recordings", name, "files", "sessions", "20260923-100000");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "video.mp4"), "x");
  const candidate = path.join(root, "recordings", name, "candidate.json");
  await writeFile(candidate, '{"confirmed": true}\n', "utf8");
  fail.on = (file) => file === candidate;

  const { enqueueLabel, jobOf, whenIdle } = await import("@/lib/jobs");
  await enqueueLabel(name);
  await whenIdle();

  const row = await jobOf(name);
  expect(row?.command).toBeUndefined();
  expect(row?.reason).toMatch(/EACCES/);
  expect(await readFile(candidate, "utf8")).toBe('{"confirmed": true}\n');
}, 30_000);
