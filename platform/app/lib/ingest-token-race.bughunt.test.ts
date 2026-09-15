import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ingestToken } from "@/lib/ingest";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * `ingestToken` reads, then mints, then writes. Two concurrent unauthenticated `/api/ingest/hello`
 * probes — the doc comment there expects a scan of up to 254 addresses — both miss the file and
 * both write a DIFFERENT token; the last writer wins and the phone paired against the other is
 * rejected. `heavy-lock.ts` solves the same problem with a `wx` create-exclusive open.
 */
let root: string;

beforeEach(async () => {
  root = await tempDataRoot("token");
  delete process.env.CHESSLAB_INGEST_TOKEN;
});

afterEach(async () => {
  delete process.env.CHESSLAB_DATA_DIR;
  await rm(root, { recursive: true, force: true });
});

it("hands every concurrent caller the token that is on disk afterwards", async () => {
  const handed = await Promise.all([ingestToken(), ingestToken(), ingestToken()]);
  const stored = (await readFile(path.join(root, "inbox", "token"), "utf8")).trim();
  expect(new Set(handed).size, "BUG: each concurrent caller minted its own token").toBe(1);
  expect(handed.every((t) => t === stored)).toBe(true);
});
