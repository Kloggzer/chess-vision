import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";
import type { LabelStream, StreamBoard, StreamCell } from "@/lib/label-stream";
import type { QueryHit } from "@/lib/query";
import {
  GROUP_SPAN,
  LANES,
  NO_AUDIT,
  NO_READS,
  NO_QUERY,
  NO_RULES,
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
  wallCells,
  cellCoverage,
} from "@/lib/lanes";

test("every lane declares a renderer, a unit and its own denominator", () => {
  expect(LANES.map((l) => l.id)).toEqual([
    "disagree", "classwall", "unknown", "control", "audit", "rules", "all",
  ]);
  for (const lane of LANES) {
    expect(lane.denominator.length).toBeGreaterThan(0);
    expect(lane.unit).toBe(lane.renderer === "board" ? "Bretter" : "Zellen");
  }
  // The one lane that must NOT be indexed against the 3 976 (CONCEPT.md 4.2, REVIEW S9).
  expect(laneById("unknown").denominator).toContain("exportierten Sessions");
});

test("a chip prints ONE number, and an unavailable lane says — with a reason", () => {
  // „nur wichtig ist ob da noch was zu tun ist" (User, 2026-08-18) — der Nenner lebt im Tooltip.
  expect(laneChip(laneById("all"), { n: 128, total: 612 })).toEqual({
    text: "Alle Bretter 128",
    title: "128 offen von 612 Bretter · Bretter im Strom",
  });
  const empty = laneChip(laneById("disagree"), { n: null, why: NO_READS });
  expect(empty.text).toBe("Modell ≠ FEN · Bretter —");
  expect(empty.text).not.toContain("0");
  expect(empty.title).toBe(NO_READS);
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
  unknown: [], violations: [], violating: {}, disagree: {}, disagreeReads: {},
  read: true, ...over,
});

const cell = (over: Partial<StreamCell> = {}): StreamCell => ({
  session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "bP", ...over,
});

const hit = (over: Partial<QueryHit> = {}): QueryHit => ({
  session: "rg-g", stem: "000100", squares: ["a1"], reads: { a1: "bB 0.91" }, accept: { a1: "bB" },
  ...over,
});

const streamOf = (over: Partial<LabelStream> = {}): LabelStream => ({
  sessions: [{ name: "g", sessionId: "rg-g", reads: true, probs: false }],
  boards: [], cells: [], audit: null, rules: true, decided: [{}],
  reads: { boards: 0, without: 0 }, progress: { boards: 0, done: 0 }, coverage: [{}], ...over,
});

test("a lane counts what is OPEN against what it holds, and null when nobody was asked", () => {
  const stream = streamOf({ boards: [board({ unknown: ["e5"] })], cells: [cell()] });
  expect(laneCount(stream, "unknown")).toEqual({ n: 1, total: 1 });
  expect(laneCount(stream, "control")).toEqual({ n: 1, total: 1 });
  // Judged in the ledger the page loaded with: still in the corpus, no longer in the stream.
  const done = streamOf({
    boards: [board({ unknown: ["e5"] })],
    cells: [cell()],
    decided: [{ "000100|e5": "empty" }],
  });
  expect(laneCount(done, "unknown")).toEqual({ n: 0, total: 1 });
  expect(openBoards(done, "unknown")).toEqual([]);
  expect(openCells(done, "control")).toEqual([]);
  // `0` would claim there is no such work; the truth is that nobody has been asked (CONCEPT.md D2).
  expect(laneCount(stream, "disagree").n).toBeNull();
  expect(laneCount(stream, "classwall").n).toBeNull();
  expect(laneCount(stream, "audit")).toEqual({ n: null, why: NO_AUDIT });
  // Der Rest des Korpus ist NICHT GEMESSEN, nicht etwa einig — der Tooltip muss das sagen.
  const read = streamOf({
    sessions: [{ name: "g", sessionId: "rg-g", reads: true, probs: true }],
    boards: [board({ disagree: { e5: "bP" } })],
    reads: { boards: 1, without: 0 },
  });
  expect(laneChip(laneById("disagree"), laneCount(read, "disagree")).title).toContain("nicht gemessen");
  expect(laneCount(streamOf({ rules: false }), "rules")).toEqual({ n: null, why: NO_RULES });
  expect(laneCount(streamOf({ audit: [] }), "audit")).toEqual({ n: 0, total: 0 });
});

test("every lane has a URL segment of its own, and the slugs are unique", () => {
  expect(LANES.map((l) => l.slug)).toEqual([
    "modell-bretter", "modell-zellen", "fen-unklar", "stichprobe", "audit", "regelbruch", "alle",
  ]);
  expect(new Set(LANES.map((l) => l.slug)).size).toBe(LANES.length);
  // `Abnicken` ist weg — der Lesezeichen-Pfad darf keine Lane mehr treffen (User, 2026-08-18).
  expect(laneBySlug("abnicken")).toBeUndefined();
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
  // EIN ⏎ überall: die alte occluded-Vorbelegung des Mittelbands schrieb Trainings-Zeilen,
  // während im Audit-Muster bestätigt wurde — 615 Fehl-Zeilen am 2026-08-15. Nur noch reviewed.
  const control = laneCells(streamOf({ cells: [cell()] }), "control")[0];
  expect(control).toMatchObject({ label: "bP", ledger: "reviewed" });

  const walled = streamOf({ boards: [board()] });
  const wall = laneCells(walled, "classwall", {
    cells: wallCells([hit()], walled),
    text: "bB ≥ 0.5",
  })[0];
  expect(wall).toMatchObject({ label: "wR", ledger: "reviewed", exception: "bB" });
  expect(wall.note).toBe("Modell bB");

  const audit = laneCells(
    streamOf({ audit: [{ session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "bP", predicted: "bB", prob: 0.91, margin: 0.62 }] }),
    "audit",
  )[0];
  expect(audit).toMatchObject({ label: "bP", ledger: "reviewed", exception: "bB" });
  // Nur die zwei Worte, die das Urteil braucht — prob/margin waren Karten-Lärm (User, 2026-08-15).
  expect(audit.note).toBe("Modell bB");
});

test("Regelbruch outlines the corrections on file and never counts itself done", () => {
  const broken = board({ violations: ["TOO_MANY_WHITE_PAWNS"], violating: { a1: "wP" } });
  const stream = streamOf({ boards: [broken, board({ pos: 1, stem: "000200" })] });
  expect(laneBoards(stream, "rules").map((b) => b.stem)).toEqual(["000100"]);
  // Highlighted, not proposed: the correction IS what is on file, so committing writes nothing and
  // a click cycles it against the FEN's word — which of the two fell is a look at the crop.
  expect(laneAccept(broken, "rules")).toEqual({ a1: "wP" });
  // Its squares are judged by construction, so the ledger can never close this board — only a
  // re-run of `audit-corrections` drops the row.
  expect(laneOpen(broken, "rules", { "000100|a1": "wP" })).toBe(true);
  expect(laneCount(stream, "rules")).toEqual({ n: 1, total: 1 });
  expect(laneChip(laneById("rules"), laneCount(stream, "rules"))).toEqual({
    text: "Regelbruch 1",
    title: "1 offen von 1 Bretter · Bretter, deren korrigierte Stellung eine Regel bricht",
  });
  expect(boardCells([broken], "rules")).toMatchObject([{ square: "a1", label: "wP", ledger: "corrections" }]);
});

test("a board lane is answerable crop by crop, which is what the phone renders", () => {
  const boards = [board({ disagree: { e5: "bP" }, disagreeReads: { e5: "bP 0.85" } })];
  expect(boardCells(boards, "disagree")).toEqual([
    {
      session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "empty",
      label: "bP", ledger: "corrections", exception: null, caption: "e5 bP 0.85",
    },
  ]);
});

test("the Klassenwand joins the server's answer to the stream, and never invents an ordinal", () => {
  const stream = streamOf({ boards: [board({ pos: 7 })] });
  expect(wallCells([hit()], stream)).toEqual([
    {
      session: 0, pos: 7, stem: "000100", square: "a1", fen_label: "wR", label: "wR",
      ledger: "reviewed", exception: "bB", caption: "a1 · FEN wR", note: "Modell bB",
    },
  ]);
  // A hit on a board no lane shows (unusable, thrown) has no place in the stream and drops.
  expect(wallCells([hit({ stem: "999999" })], stream)).toEqual([]);
  expect(wallCells([hit({ session: "rg-other" })], stream)).toEqual([]);
  // The FEN's own word is the pre-label; the query's class is the exception, never the default.
  expect(wallCells([hit({ accept: { a1: "wQ" } })], stream)[0]).toMatchObject({
    label: "wR", ledger: "reviewed", exception: "wQ",
  });
});

test("the Klassenwand counts its own query, and says — while the answer is missing", () => {
  const stream = streamOf({
    sessions: [{ name: "g", sessionId: "rg-g", reads: true, probs: true }],
    boards: [board()],
  });
  const wall = { cells: wallCells([hit({ squares: ["a1", "h1"], accept: { a1: "bB", h1: "bN" } })], stream), text: "bB ≥ 0.5" };
  expect(laneCount(stream, "classwall", wall)).toEqual({
    n: 2, total: 2, denominator: "Zellen, auf die »bB ≥ 0.5« passt",
  });
  // The denominator travels with the number: a bare 2 would not say which question was asked.
  expect(laneChip(laneById("classwall"), laneCount(stream, "classwall", wall)).title).toContain("»bB ≥ 0.5«");
  const done = { ...stream, decided: [{ "000100|a1": "wR" }] };
  expect(laneCount(done, "classwall", wall)).toMatchObject({ n: 1, total: 2 });
  // No answer is not "no work": the query is server-side and may simply not have come back.
  expect(laneCount(stream, "classwall")).toEqual({ n: null, why: NO_QUERY });
});

test("a crop card prints SAM's number, and stays silent where nothing was measured", () => {
  const coverage = [{ "000447": { g1: 0.244, h1: 0.605, a1: 0.003 } }];
  const at = (stem: string, square: string) => cellCoverage(coverage, { session: 0, stem, square });
  expect(at("000447", "h1")).toBe("61 %");
  expect(at("000447", "g1")).toBe("24 %");
  // Half a percent of a crop is not an occlusion, and a card that says `0 %` reads as a measurement.
  expect(at("000447", "a1")).toBeNull();
  // No row for the square, no row for the frame, no session: all three are "nobody measured".
  expect(at("000447", "e4")).toBeNull();
  expect(at("000999", "h1")).toBeNull();
  expect(cellCoverage([], { session: 3, stem: "000447", square: "h1" })).toBeNull();
});
