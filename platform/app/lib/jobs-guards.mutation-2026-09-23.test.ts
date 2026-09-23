/** Job-Wachen, die bei der Mutationsprobe vom 2026-09-23 alle Tests ueberlebten. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, onTestFinished, test, vi } from "vitest";
import { inboxDir } from "@/lib/ingest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ once: false }));

vi.mock("@/lib/atomic", async (original) => {
  const real = await original<typeof import("@/lib/atomic")>();
  return {
    ...real,
    appendRows: async (file: string, rows: unknown[]) => {
      if (fail.once) {
        fail.once = false;
        throw Object.assign(new Error(`EMFILE: ${file}`), { code: "EMFILE" });
      }
      return real.appendRows(file, rows);
    },
  };
});

const { enqueueLabel, enqueuePhoneRecord, holdExport, jobOf, whenIdle } = await import("@/lib/jobs");

async function withCandidate(prefix: string, name: string): Promise<string> {
  const root = await tempDataRoot(prefix);
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
  const session = path.join(root, "recordings", name, "files", "sessions", "20260923-100000");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "video.mp4"), "x");
  const candidate = path.join(root, "recordings", name, "candidate.json");
  await writeFile(candidate, '{"confirmed": true}\n', "utf8");
  return candidate;
}

test("eine vorhandene candidate.json startet das Label-Werkzeug nicht", async () => {
  const name = "2026-09-23-11-00-00";
  const candidate = await withCandidate("label-keep", name);
  await enqueueLabel(name);
  await whenIdle();
  const row = await jobOf(name);
  expect(row?.command).toBeUndefined();
  expect(row?.reason).toMatch(/nothing was overwritten/);
  expect(await readFile(candidate, "utf8")).toBe('{"confirmed": true}\n');
}, 30_000);

test("ein zweiter Druck auf Label reiht keinen zweiten Lauf ein", async () => {
  const name = "2026-09-23-11-00-01";
  await withCandidate("label-dedupe", name);
  const first = await enqueueLabel(name);
  expect(await enqueueLabel(name)).toBe(first);
  await whenIdle();
}, 30_000);

test("ein zweiter Druck auf Handy-Record reiht keinen zweiten Lauf ein", async () => {
  await tempDataRoot("phone-dedupe");
  process.env.CHESSLAB_DESKTOP_BIN = path.join(process.env.CHESSLAB_DATA_DIR ?? "", "missing-tool");
  onTestFinished(() => void delete process.env.CHESSLAB_DESKTOP_BIN);
  const name = "2026-09-23-11-00-02";
  const first = await enqueuePhoneRecord(name);
  expect(await enqueuePhoneRecord(name)).toBe(first);
  await whenIdle();
}, 30_000);

test("eine gescheiterte Ledger-Zeile vergiftet die folgenden nicht", async () => {
  await tempDataRoot("ledger-poison");
  fail.once = true;
  await expect(holdExport("2026-09-23-11-00-03", 1_000)).rejects.toThrow(/EMFILE/);
  const later = await holdExport("2026-09-23-11-00-04", 1_000);
  const lines = (await readFile(path.join(inboxDir(), "jobs.jsonl"), "utf8")).trim().split("\n");
  expect(lines.map((l) => JSON.parse(l).name)).toEqual([later.name]);
});
