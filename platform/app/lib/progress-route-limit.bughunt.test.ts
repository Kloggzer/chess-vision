import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";

/**
 * `jobs(limit)` sorts the whole corpus by `queuedAt` and slices BEFORE the route filters by name.
 * A recording outside the 100 newest rows therefore polls as idle while its job is running.
 */
let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "chesslab-progress-"));
  await mkdir(path.join(root, "inbox", "jobs"), { recursive: true });
  const rows: string[] = [];
  rows.push(JSON.stringify({
    name: "old-one", kind: "export", state: "running",
    queuedAt: "2020-01-01T00:00:00.000Z", startedAt: "2020-01-01T00:00:00.000Z",
    log: path.join(root, "inbox", "jobs", "old-one.export.log"), pid: process.pid,
  }));
  for (let i = 0; i < 120; i++) {
    rows.push(JSON.stringify({
      name: `filler-${i}`, kind: "export", state: "done",
      queuedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    }));
  }
  await writeFile(path.join(root, "inbox", "jobs.jsonl"), rows.join("\n") + "\n", "utf8");
  await writeFile(path.join(root, "inbox", "jobs", "old-one.export.log"), "state: cutting at 12.34s\n", "utf8");
  process.env.CHESSLAB_DATA_DIR = root;
});

afterEach(async () => {
  delete process.env.CHESSLAB_DATA_DIR;
  await rm(root, { recursive: true, force: true });
});

it("finds the running job of an old recording behind 120 newer ledger rows", async () => {
  const { GET } = await import("@/app/api/chain/[name]/progress/route");
  const answer = await GET(new Request("http://local/api/chain/old-one/progress"), {
    params: Promise.resolve({ name: "old-one" }),
  } as never);
  const body = (await answer.json()) as { job: { name: string } | null };
  expect(body.job, "BUG: jobs(100) slices before the route filters by name").not.toBeNull();
});
