import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { coveredSquares, PIECE_VISIBLE_MAX } from "@/lib/classes";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "chesslab-matte-"));
  process.env.CHESSLAB_DATA_DIR = dir;
  await mkdir(path.join(dir, "sessions", "rg-g"), { recursive: true });
  (globalThis as { __chesslabMattes?: Map<string, unknown> }).__chesslabMattes?.clear();
});

const write = (lines: string[]) =>
  writeFile(path.join(dir, "sessions", "rg-g", "matte.jsonl"), lines.join("\n") + "\n", "utf8");

test("the threshold is the one the loss uses, and it is exclusive", () => {
  expect(PIECE_VISIBLE_MAX).toBe(0.15);
  expect(coveredSquares({ a1: 0.15, b1: 0.1501, c1: 0.9 })).toEqual(["b1", "c1"]);
});

test("a frame's coverage comes back keyed by stem, a skipped one without an alpha", async () => {
  const { loadMatte } = await import("@/lib/matte");
  await write([
    JSON.stringify({ frame: "000144", ply: 1, reason: "occluded", concepts: { hand: 0.9 }, coverage: { a1: 0.0, h4: 0.94 } }),
    JSON.stringify({ frame: "000150", ply: 1, reason: "occluded", skipped: "zone too big" }),
    '{"frame": "000160", "cov',
  ]);
  const matte = await loadMatte("g");
  expect(matte.get("000144")?.coverage.h4).toBe(0.94);
  expect(matte.get("000144")?.reason).toBe("occluded");
  expect(matte.get("000150")?.skipped).toBe("zone too big");
  // A half-written trailing line is not a matte; it must not take the readable ones down with it.
  expect(matte.has("000160")).toBe(false);
});

test("a session without a matte answers empty, which is not an error", async () => {
  const { loadMatte } = await import("@/lib/matte");
  expect((await loadMatte("g")).size).toBe(0);
});

test("a recut row says whose alpha its numbers came from", async () => {
  const { loadMatte } = await import("@/lib/matte");
  await write([
    JSON.stringify({ frame: "000144", coverage: { a1: 0.9 }, alpha: "fixed" }),
    JSON.stringify({ frame: "000145", coverage: { a1: 0.9 } }),
  ]);
  const matte = await loadMatte("g");
  expect(matte.get("000144")?.alpha).toBe("fixed");
  expect(matte.get("000145")?.alpha).toBeUndefined();
});

test("painted pixels are pending until a recut newer than them has read the file", async () => {
  const { alphaState } = await import("@/lib/matte");
  const sam = { stem: "1", concepts: {}, coverage: {} };
  const fixed = { ...sam, alpha: "fixed" };
  expect(alphaState(sam, undefined, 100)).toBe("sam");
  expect(alphaState(sam, 90, 100)).toBe("pending");
  expect(alphaState(fixed, 90, 100)).toBe("fixed");
  // Painted AGAIN after the recut: the numbers on screen are SAM's once more.
  expect(alphaState(fixed, 110, 100)).toBe("pending");
});

test("a session without corrected alphas answers an empty map, not an error", async () => {
  const { fixedAlphas } = await import("@/lib/matte");
  expect((await fixedAlphas("g")).size).toBe(0);
});
