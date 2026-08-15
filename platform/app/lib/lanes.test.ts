import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";
import type { LabelStream, StreamBoard, StreamCell } from "@/lib/label-stream";
import {
  GROUP_SPAN,
  LANES,
  NO_AUDIT,
  NO_PROBS,
  boardCells,
  collapseEvents,
  groupBySquare,
  keepPosition,
  laneAccept,
  laneBoards,
  laneById,
  laneBySlug,
  laneCells,
  laneChip,
  laneCount,
  laneOpen,
  lanePath,
  openBoards,
  openCells,
} from "@/lib/lanes";

test("every lane declares a renderer, a unit and its own denominator", () => {
  expect(LANES.map((l) => l.id)).toEqual([
    "hands", "unsure", "disagree", "classwall", "unknown", "control", "audit", "stored", "all",
  ]);
  for (const lane of LANES) {
    expect(lane.denominator.length).toBeGreaterThan(0);
    expect(lane.unit).toBe(lane.renderer === "board" ? "Bretter" : "Zellen");
  }
  // The one lane that must NOT be indexed against the 3 976 (CONCEPT.md 4.2, REVIEW S9).
  expect(laneById("unknown").denominator).toContain("exportierten Sessions");
});

test("a chip always carries its unit, and an unavailable lane says — with a reason", () => {
  // The stream shows only OPEN work, so the chip has to say what the number is measured against.
  expect(laneChip(laneById("hands"), { n: 128, total: 612 })).toEqual({
    text: "Hände 128/612 Bretter",
    title: "128 offen von 612 Bretter · Bretter mit Vorschlägen",
  });
  const empty = laneChip(laneById("disagree"), { n: null, why: NO_PROBS });
  expect(empty.text).toBe("Modell ≠ FEN —");
  expect(empty.text).not.toContain("0");
  expect(empty.title).toBe(NO_PROBS);
});

test("switching a lane lands on the first item at or after the position you were on", () => {
  const positions = [3, 9, 41, 77];
  expect(keepPosition(positions, 0)).toBe(0);
  expect(keepPosition(positions, 9)).toBe(1);
  expect(keepPosition(positions, 10)).toBe(2);
  expect(keepPosition(positions, 999)).toBe(3); // past the end: the last item, never a reset
  expect(keepPosition([], 5)).toBe(0);
  // A cell lane is grouped BY SQUARE, so its ordinals do not ascend — the search is by value.
  expect(keepPosition([77, 3, 41, 9], 10)).toBe(2);
});

test("cells group by square inside a session while the sessions stay sequential", () => {
  const cells = [
    { session: 1, square: "a1", stem: "000100" },
    { session: 0, square: "e5", stem: "000900" },
    { session: 0, square: "b2", stem: "000200" },
    { session: 0, square: "e5", stem: "000100" },
  ];
  expect(groupBySquare(cells).map((c) => `${c.session}${c.square}${c.stem}`)).toEqual([
    "0b2000200", "0e5000100", "0e5000900", "1a1000100",
  ]);
});

test("an event is one square, one FEN word and frames within GROUP_SPAN", () => {
  const cell = (stem: string, square = "e5", fen_label = "bP") => ({ stem, square, fen_label });
  const groups = collapseEvents([
    cell("000100"),
    cell("000200"),
    cell(String(200 + GROUP_SPAN + 1).padStart(6, "0")),
    cell("000420", "e5", "wQ"),
    cell("000430", "f6"),
  ]);
  expect(groups.map((g) => g.members.length)).toEqual([2, 1, 1, 1]);
  expect(groups[0].head.stem).toBe("000100");
});

const board = (over: Partial<StreamBoard> = {}): StreamBoard => ({
  session: 0, pos: 0, stem: "000100", ply: 4, fen: "8/8/8/8/8/8/8/R6R w - - 0 1",
  unknown: [], hands: {}, reads: {}, disagree: {}, disagreeReads: {}, proposed: true, ...over,
});

const cell = (over: Partial<StreamCell> = {}): StreamCell => ({
  session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "bP", score: 0.5, kind: "unsure", ...over,
});

const streamOf = (over: Partial<LabelStream> = {}): LabelStream => ({
  sessions: [{ name: "g", sessionId: "rg-g", proposals: true, probs: false }],
  boards: [], cells: [], audit: null, decided: [{}], progress: { boards: 0, done: 0 }, ...over,
});

test("a lane counts what is OPEN against what it holds, and null when nobody was asked", () => {
  const stream = streamOf({ boards: [board({ hands: { e5: "occluded" } })], cells: [cell()] });
  expect(laneCount(stream, "hands")).toEqual({ n: 1, total: 1 });
  expect(laneCount(stream, "unsure")).toEqual({ n: 1, total: 1 });
  // Judged in the ledger the page loaded with: still in the corpus, no longer in the stream.
  const done = streamOf({
    boards: [board({ hands: { e5: "occluded" } })],
    cells: [cell()],
    decided: [{ "000100|e5": "occluded" }],
  });
  expect(laneCount(done, "hands")).toEqual({ n: 0, total: 1 });
  expect(openBoards(done, "hands")).toEqual([]);
  expect(openCells(done, "unsure")).toEqual([]);
  // `0` would claim there is no such work; the truth is that nobody has been asked (CONCEPT.md D2).
  expect(laneCount(stream, "disagree").n).toBeNull();
  expect(laneCount(stream, "classwall").n).toBeNull();
  expect(laneCount(stream, "audit")).toEqual({ n: null, why: NO_AUDIT });
  expect(laneCount(streamOf({ audit: [] }), "audit")).toEqual({ n: 0, total: 0 });
});

test("every lane has a URL segment of its own, and the slugs are unique", () => {
  expect(LANES.map((l) => l.slug)).toEqual([
    "haende", "unsicher", "modell", "klassenwand", "fen-unklar", "stichprobe", "audit", "abnicken", "alle",
  ]);
  expect(new Set(LANES.map((l) => l.slug)).size).toBe(LANES.length);
  expect(laneBySlug("abnicken")?.id).toBe("stored");
  expect(laneBySlug("nope")).toBeUndefined();
  expect(lanePath("unknown")).toBe("/strom/labeln/fen-unklar");
});

test("Alle Bretter closes only when every square is judged — the free-hand lane's own rule", () => {
  const b = board();
  expect(laneOpen(b, "all", {})).toBe(true);
  expect(laneOpen(b, "all", { "000100|a1": "wR" })).toBe(true);
  const every = Object.fromEntries(Object.keys(fenLabels(b.fen)).map((sq) => [`000100|${sq}`, "empty"]));
  expect(laneOpen(b, "all", every)).toBe(false);
});

test("the FEN-unklar lane pre-selects the FEN's own word, which is what rescues the cell", () => {
  // `labeling.py` DROPS an unknown cell unless a correction exists, so confirming the FEN there
  // is a real write and not a no-op (CONCEPT.md D5).
  const b = board({ unknown: ["a1", "b1"] });
  expect(laneAccept(b, "unknown")).toEqual({ a1: "wR", b1: "empty" });
  expect(laneBoards(streamOf({ boards: [b] }), "unknown")).toHaveLength(1);
  // And `Alle Bretter` pre-selects nothing at all — it is free-hand paint, never a queue.
  expect(laneAccept(b, "all")).toEqual({});
  expect(laneOpen(b, "all", { "000100|a1": "wR" })).toBe(true);
  expect(laneOpen(b, "unknown", { "000100|a1": "wR", "000100|b1": "empty" })).toBe(false);
});

test("a cell lane carries its own pre-label and ledger, and the identity lanes never write the model by default", () => {
  const unsure = laneCells(streamOf({ cells: [cell()] }), "unsure")[0];
  expect(unsure).toMatchObject({ label: "occluded", ledger: "corrections", exception: null });

  const control = laneCells(streamOf({ cells: [cell({ kind: "control" })] }), "control")[0];
  expect(control).toMatchObject({ label: "bP", ledger: "reviewed" });

  const wall = laneCells(
    streamOf({ cells: [cell({ kind: "wall", predicted: "bB", prob: 0.91 })] }),
    "classwall",
  )[0];
  expect(wall).toMatchObject({ label: "bP", ledger: "reviewed", exception: "bB" });
  expect(wall.note).toBe("Modell bB 0.91");

  const audit = laneCells(
    streamOf({ audit: [{ session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "bP", predicted: "bB", prob: 0.91, margin: 0.62 }] }),
    "audit",
  )[0];
  expect(audit).toMatchObject({ label: "bP", ledger: "reviewed", exception: "bB" });
  expect(audit.note).toContain("margin 0.62");
});

test("Abnicken counts its own bundles and closes a board on the first verdict of any square", () => {
  const stream = streamOf({
    sessions: [
      { name: "g", sessionId: "rg-g", proposals: true, probs: false },
      { name: "2026-08-08-22-09-12", sessionId: "phone-20260808-220912", proposals: false, probs: false, stored: true },
    ],
    boards: [board(), board({ session: 1, pos: 1, stem: "0000", proposed: false })],
    decided: [{}, {}],
  });
  expect(laneBoards(stream, "stored").map((b) => b.stem)).toEqual(["0000"]);
  // Proposal-less boards must not inflate the lane whose denominator says "mit Vorschlägen".
  expect(laneBoards(stream, "all").map((b) => b.stem)).toEqual(["000100"]);
  expect(laneCount(stream, "stored")).toEqual({
    n: 1,
    total: 1,
    denominator: "Stored-Bretter über 1 Bundles ohne Video",
  });
  expect(laneChip(laneById("stored"), laneCount(stream, "stored")).title).toContain("über 1 Bundles");

  const stored = laneBoards(stream, "stored")[0];
  expect(laneAccept(stored, "stored")).toEqual({});
  expect(laneOpen(stored, "stored", {})).toBe(true);
  expect(laneOpen(stored, "stored", { "0000|h8": "empty" })).toBe(false);
  // Without flags `plan.rejected` stays empty, so the whole-board verdict is the lane's own knob.
  expect(laneById("stored").reviewAll).toBe(true);
  expect(laneById("all").reviewAll).toBeUndefined();
});

test("a board lane is answerable crop by crop, which is what the phone renders", () => {
  const boards = [board({ hands: { e5: "occluded" }, reads: { e5: "grid 0.85" } })];
  expect(boardCells(boards, "hands")).toEqual([
    {
      session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "empty",
      label: "occluded", ledger: "corrections", exception: null, caption: "e5 grid 0.85",
    },
  ]);
});
