import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "review-notes-"));
  vi.doMock("@/lib/data", () => ({
    dataDir: () => dir,
    checkName: (v: string, what: string) => {
      if (!/^[\w.-]+$/.test(v)) throw new Error(`bad ${what}: ${v}`);
    },
  }));
  vi.resetModules();
  (globalThis as { __chesslabReviewNotes?: Map<string, unknown> }).__chesslabReviewNotes?.clear();
});
afterEach(() => vi.doUnmock("@/lib/data"));

const load = () => import("@/lib/review-notes");

test("a board verdict lands in the file and comes back reload-proof", async () => {
  const { appendReviewNotes, unusableBoards, reviewNotesPath } = await load();
  await appendReviewNotes([{ session_id: "rg-a", frame: "001482", verdict: "unusable-board" }]);
  expect(await unusableBoards("rg-a")).toEqual(new Set(["001482"]));
  const text = await readFile(reviewNotesPath(), "utf8");
  expect(JSON.parse(text.trim())).toMatchObject({ session_id: "rg-a", frame: "001482", verdict: "unusable-board" });
});

test("intervals and boards are separate answers, per session", async () => {
  const { appendReviewNotes, unusableBoards, badIntervals } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", ply: 34, verdict: "bad-interval" },
    { session_id: "rg-b", frame: "000100", verdict: "unusable-board", reason: "dunkler Müll" },
  ]);
  expect(await badIntervals("rg-a")).toEqual(new Set([34]));
  expect(await unusableBoards("rg-a")).toEqual(new Set());
  expect(await unusableBoards("rg-b")).toEqual(new Set(["000100"]));
});

test("validate refuses what the wire must never carry", async () => {
  const { validateNote } = await load();
  expect(() => validateNote({ session_id: "rg-a", frame: "x", verdict: "nope" })).toThrow(/verdict/);
  expect(() => validateNote({ session_id: "rg-a", ply: -1, verdict: "bad-interval" })).toThrow(/ply/);
  expect(validateNote({ session_id: "rg-a", ply: 3, verdict: "bad-interval" })).toEqual({
    session_id: "rg-a",
    ply: 3,
    verdict: "bad-interval",
  });
});

test("a half-written trailing line is skipped, not fatal", async () => {
  const { appendReviewNotes, unusableBoards, reviewNotesPath } = await load();
  await appendReviewNotes([{ session_id: "rg-a", frame: "000001", verdict: "unusable-board" }]);
  const file = reviewNotesPath();
  await writeFile(file, (await readFile(file, "utf8")) + '{"session_id":"rg-a","fr', "utf8");
  expect(await unusableBoards("rg-a")).toEqual(new Set(["000001"]));
});
