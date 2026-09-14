import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";

/**
 * `/api/corrections` and `/api/unusable-cells` throw on a non-array `rows`; `/api/review-notes`
 * still folds it into `[]` and answers 200. The client then holds verdicts it never wrote.
 */
let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "chesslab-notes-"));
  await mkdir(path.join(root, "recordings", "rec-1"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
});

afterEach(async () => {
  delete process.env.CHESSLAB_DATA_DIR;
  await rm(root, { recursive: true, force: true });
});

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/review-notes/route");
  return POST(new Request("http://local/api/review-notes", { method: "POST", body: JSON.stringify(body) }));
};

it("refuses a body whose rows is not an array instead of reporting written: 0", async () => {
  const answer = await post({ rows: { session_id: "rg-rec-1", frame: "000001", verdict: "matte-ok" } });
  expect(answer.status, "BUG: a malformed body is accepted as an empty batch").toBe(400);
});

it("refuses a retract whose rows is not an array", async () => {
  const answer = await post({ retract: true, rows: "000001" });
  expect(answer.status).toBe(400);
});
