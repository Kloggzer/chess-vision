// Against disk: `adoptPgn` is a file copy with one rule, and the rule is what is tested.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { adoptFailures, adoptOffered, clearAdoptFailures } from "@/lib/chain";
import { gameDir } from "@/lib/data";
import { offeredPgns } from "@/lib/queues";
import type { ChainState } from "@/lib/chain";
import type { QueueRow } from "@/lib/queues";
import { tempDataRoot } from "@/lib/test-fixtures";

const NAME = "2026-08-14-09-23-19";

async function bundle(name: string, pgn: string | null): Promise<string> {
  const dir = gameDir(name);
  await mkdir(path.join(dir, "files", "games"), { recursive: true });
  if (pgn) await writeFile(path.join(dir, "files", "games", "game.pgn"), pgn, "utf8");
  return dir;
}

const reference = (name: string) => readFile(path.join(gameDir(name), "reference.pgn"), "utf8");

beforeEach(async () => {
  await tempDataRoot("adopt");
  clearAdoptFailures();
});

test("the phone's PGN becomes the reference — that is the default, no press involved", async () => {
  await bundle(NAME, "1. e4 e5");

  await adoptOffered([NAME]);

  expect(await reference(NAME)).toBe("1. e4 e5");
  expect(adoptFailures()).toEqual([]);
});

test("an existing reference is never overwritten, and the refusal is reported", async () => {
  const dir = await bundle(NAME, "1. e4 e5");
  await writeFile(path.join(dir, "reference.pgn"), "1. d4 d5", "utf8");

  await adoptOffered([NAME]);

  expect(await reference(NAME)).toBe("1. d4 d5");
  expect(adoptFailures()).toEqual([expect.stringContaining(NAME)]);
});

// The same refusal on every read of the queue would be a write and a log line per page view.
test("a refusal is remembered until a press clears it", async () => {
  await bundle(NAME, null);

  await adoptOffered([NAME]);
  await adoptOffered([NAME]);
  expect(adoptFailures()).toHaveLength(1);

  clearAdoptFailures();
  expect(adoptFailures()).toEqual([]);
});

const CHAIN = { offeredPgn: "game.pgn", useless: null } as unknown as ChainState;
const row = (name: string, patch: Partial<QueueRow> = {}): QueueRow =>
  ({ name, title: null, plies: 0, frames: 0, archived: false, chain: CHAIN, ...patch }) as QueueRow;

test("archived and useless bundles are nobody's work — their PGN is not adopted either", () => {
  const rows = [
    row("2026-08-13-00-00-01"),
    row("2026-08-13-00-00-02", { archived: true }),
    row("2026-08-13-00-00-03", { chain: { ...CHAIN, useless: { at: "2026-08-14T20:00:00Z" } } as ChainState }),
    row("2026-08-13-00-00-04", { chain: { ...CHAIN, offeredPgn: null } as ChainState }),
  ];

  expect(offeredPgns(rows)).toEqual(["2026-08-13-00-00-01"]);
});
