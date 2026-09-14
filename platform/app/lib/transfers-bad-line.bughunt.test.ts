import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { transfers } from "@/lib/ingest";

/**
 * Every other JSONL reader in the app parses per line and skips a half-written one. `transfers`
 * maps `JSON.parse` over all lines inside one function-wide `try`, so a single truncated row —
 * and `complete()` appends to this ledger from concurrent requests — makes the transfers page say
 * no transfer ever happened.
 */
let root: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chesslab-transfers-"));
  process.env.CHESSLAB_DATA_DIR = root;
  await mkdir(path.join(root, "inbox"), { recursive: true });
});

test("a half-written ledger line drops that row, not every row", async () => {
  await writeFile(path.join(root, "inbox", "transfers.jsonl"),
    [JSON.stringify({ name: "2026-09-01-10-00-00", status: "landed" }), '{"name": "2026-09-02-10-00'].join("\n") + "\n",
    "utf8");
  const rows = await transfers();
  expect(rows.map((r) => r.name), "BUG: one bad line empties the whole transfers page")
    .toEqual(["2026-09-01-10-00-00"]);
});
