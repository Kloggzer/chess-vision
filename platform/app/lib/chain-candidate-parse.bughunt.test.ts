import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, it } from "vitest";
import { chainState } from "@/lib/chain";

/**
 * `chain.ts:147` reads `candidate.json` with `.catch(() => null)` and then parses it UNGUARDED.
 * `queueRows` calls `chainState` once per recording inside one `Promise.all`, so a single
 * half-written candidate rejects the whole list and blanks every queue page.
 */
const NAME = "2026-08-13-12-10-55";
let data: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-chain-parse-"));
  process.env.CHESSLAB_DATA_DIR = data;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
});

it("treats a half-written candidate.json as unconfirmed instead of throwing", async () => {
  await writeFile(path.join(data, "recordings", NAME, "candidate.json"), '{"moves": [], "confir', "utf8");
  const state = await chainState(NAME);
  expect(state.confirmed, "BUG: JSON.parse of a truncated candidate rejects the whole page").toBe(false);
});
