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

test("the matte review's two questions are answered per frame, last row winning", async () => {
  const { appendReviewNotes, frameReviews, unusableBoards } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", frame: "000144", verdict: "matte-bad" },
    { session_id: "rg-a", frame: "000144", verdict: "matte-ok" },
    { session_id: "rg-a", frame: "000144", verdict: "position-ok" },
  ]);
  const got = (await frameReviews("rg-a")).get("000144");
  expect(got).toMatchObject({ matte: "ok", position: "ok" });
  expect(got?.matteAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  // A frame verdict is not a thrown-out board — the two must never bleed into each other.
  expect(await unusableBoards("rg-a")).toEqual(new Set());
});

test("a reported hand is a frame verdict, never a thrown board — the FEN still holds", async () => {
  const { appendReviewNotes, frameReviews, unusableBoards } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", frame: "000447", verdict: "dirty-frame", reason: "Labeln-Strom: d" },
    { session_id: "rg-a", frame: "000447", verdict: "matte-ok" },
  ]);
  expect((await frameReviews("rg-a")).get("000447")).toMatchObject({ dirty: true, matte: "ok" });
  expect(await unusableBoards("rg-a")).toEqual(new Set());
});

test("eine zurückgenommene dirty-Meldung verschwindet aus der Datei — sonst exportiert sie weiter", async () => {
  const { appendReviewNotes, dropReviewNotes, frameReviews, unusableBoards } = await load();
  await appendReviewNotes([
    { session_id: "rg-a", frame: "006186", verdict: "dirty-frame", reason: "Labeln-Strom: Crop-Ecke" },
    { session_id: "rg-a", frame: "006512", verdict: "dirty-frame" },
    { session_id: "rg-a", frame: "006186", verdict: "unusable-board" },
  ]);
  await dropReviewNotes([{ session_id: "rg-a", frame: "006186", verdict: "dirty-frame" }]);
  expect(await frameReviews("rg-a")).toEqual(new Map([["006512", { dirty: true }]]));
  // Nur die eine Frage wird zurückgenommen, die anderen Urteile über dasselbe Frame bleiben.
  expect(await unusableBoards("rg-a")).toEqual(new Set(["006186"]));
});

test("nothing may write an unreadable-square verdict — coverage answers that", async () => {
  const { validateNote } = await load();
  expect(() => validateNote({ session_id: "rg-a", frame: "000144", verdict: "unreadable" })).toThrow(/verdict/);
  expect(() => validateNote({ session_id: "rg-a", frame: "000144", verdict: "occluded" })).toThrow(/verdict/);
});




test("a half-written trailing line is skipped, not fatal", async () => {
  const { appendReviewNotes, unusableBoards, reviewNotesPath } = await load();
  await appendReviewNotes([{ session_id: "rg-a", frame: "000001", verdict: "unusable-board" }]);
  const file = reviewNotesPath();
  await writeFile(file, (await readFile(file, "utf8")) + '{"session_id":"rg-a","fr', "utf8");
  expect(await unusableBoards("rg-a")).toEqual(new Set(["000001"]));
});
