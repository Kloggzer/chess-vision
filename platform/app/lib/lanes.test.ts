import { expect, test } from "vitest";
import { fenLabels } from "@/lib/fen";
import type { LabelStream, StreamBoard, StreamCell } from "@/lib/label-stream";
import type { QueryHit } from "@/lib/query";
import {
  GROUP_SPAN,
  LANES,
  NO_AUDIT,
  NO_HAND,
  NO_POSITION,
  NO_READS,
  NO_QUERY,
  boardCells,
  reachesPool,
  collapseEvents,
  groupBySquare,
  handBeside,
  keepPosition,
  laneAccept,
  laneById,
  laneBySlug,
  laneCells,
  laneChip,
  laneCount,
  laneOpen,
  lanePath,
  openCells,
  recentCells,
  wallCells,
  cellCoverage,
} from "@/lib/lanes";

test("every lane declares a renderer, a unit and its own denominator", () => {
  // DREI, nach der Frage geschnitten: strittige Zelle, blinde Stichprobe, ganzes Brett. Neun
  // Lanes waren neun Herkuenfte derselben drei Fragen und wurden zu zweit benutzt (2026-09-07).
  expect(LANES.map((l) => l.id)).toEqual(["audit", "control", "all"]);
  for (const lane of LANES) {
    expect(lane.denominator.length).toBeGreaterThan(0);
    expect(lane.unit).toBe(lane.renderer === "board" ? "Bretter" : "Zellen");
  }
  // The one lane that must NOT be indexed against the 3 976 (CONCEPT.md 4.2, REVIEW S9).
  expect(laneById("control").denominator).toContain("exportierten Sessions");
});

test("a chip prints ONE number, and an unavailable lane says — with a reason", () => {
  // „nur wichtig ist ob da noch was zu tun ist" (User, 2026-08-18) — der Nenner lebt im Tooltip.
  expect(laneChip(laneById("all"), { n: 128, total: 612 })).toEqual({
    text: "Bretter 128",
    title: "128 offen von 612 Bretter · Bretter im Strom",
  });
  const empty = laneChip(laneById("audit"), { n: null, why: NO_READS });
  expect(empty.text).toBe("Strittig —");
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

test("an event never crosses a recording boundary, even when frame and square match", () => {
  const groups = collapseEvents([
    { session: 0, stem: "000100", square: "e5", fen_label: "bP" },
    { session: 1, stem: "000100", square: "e5", fen_label: "bP" },
  ]);

  expect(groups, "a long press must not apply one recording's crop verdict to another recording").toHaveLength(2);
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
  sessions: [{ name: "g", sessionId: "rg-g", reads: true, probs: false, reportedDirty: [] }],
  boards: [], cells: [], recent: [], audit: null, rules: true, hands: null, positions: null, decided: [{}],
  reads: { boards: 0, without: 0 }, progress: { boards: 0, done: 0 }, coverage: [{}],
  frameHands: [{}], handsMeasured: [true], ...over,
});

test("a lane counts what is OPEN against what it holds, and null only when EVERY source is silent", () => {
  const stream = streamOf({ boards: [board({ unknown: ["e5"] })], cells: [cell()] });
  expect(laneCount(stream, "all")).toEqual({ n: 1, total: 1 });
  expect(laneCount(stream, "control")).toEqual({ n: 1, total: 1 });
  // Judged in the ledger the page loaded with: still in the corpus, no longer in the stream.
  const done = streamOf({ cells: [cell()], decided: [{ "000100|e5": "empty" }] });
  expect(openCells(done, "control")).toEqual([]);
  // `0` would claim there is no such work; the truth is that nobody has been asked (CONCEPT.md D2).
  expect(laneCount(stream, "audit").n).toBeNull();
  expect(laneCount(stream, "audit").why).toContain(NO_AUDIT);
  expect(laneCount(stream, "audit").why).toContain(NO_POSITION);
  // EINE gelaufene Quelle macht die Lane zaehlbar — und der Tooltip nennt die schweigenden.
  const partial = laneCount(streamOf({ audit: [] }), "audit");
  expect(partial.n).toBe(0);
  expect(partial.denominator).toContain("ES FEHLT");
  expect(partial.denominator).toContain(NO_HAND);
});

test("every lane has a URL segment of its own, and the slugs are unique", () => {
  expect(LANES.map((l) => l.slug)).toEqual(["audit", "stichprobe", "alle"]);
  expect(new Set(LANES.map((l) => l.slug)).size).toBe(LANES.length);
  // `Abnicken` ist weg — der Lesezeichen-Pfad darf keine Lane mehr treffen (User, 2026-08-18).
  expect(laneBySlug("abnicken")).toBeUndefined();
  expect(laneBySlug("nope")).toBeUndefined();
  expect(lanePath("audit")).toBe("/strom/labeln/audit");
});

test("die Bretter-Lane closes only when every square is judged — the free-hand lane's own rule", () => {
  const b = board();
  expect(laneOpen(b, "all", {})).toBe(true);
  expect(laneOpen(b, "all", { "000100|a1": "wR" })).toBe(true);
  const every = Object.fromEntries(Object.keys(fenLabels(b.fen)).map((sq) => [`000100|${sq}`, "empty"]));
  expect(laneOpen(b, "all", every)).toBe(false);
});

test("die Bretter-Lane waehlt alles vor, was jemand an diesem Brett angezweifelt hat", () => {
  // `labeling.py` DROPS an unknown cell unless a correction exists, so confirming the FEN there
  // is a real write and not a no-op (CONCEPT.md D5).
  const b = board({ unknown: ["a1", "b1"], disagree: { e5: "bP" }, violating: { h1: "wQ" } });
  expect(laneAccept(b, "all")).toEqual({ a1: "wR", b1: "empty", e5: "bP", h1: "wQ" });
  // Schaerfe schlaegt Meinung: wo ein Regelbruch und eine Modell-Lesart auf dasselbe Feld zeigen,
  // gewinnt die Korrektur, die auf der Platte steht.
  expect(laneAccept(board({ disagree: { h1: "bN" }, violating: { h1: "wQ" } }), "all")).toEqual({ h1: "wQ" });
  expect(laneAccept(b, "control")).toEqual({});
  expect(laneOpen(b, "all", { "000100|a1": "wR" })).toBe(true);
});

test("a cell lane carries its own pre-label and ledger, and the identity lanes never write the model by default", () => {
  // EIN ⏎ überall: die alte occluded-Vorbelegung des Mittelbands schrieb Trainings-Zeilen,
  // während im Audit-Muster bestätigt wurde — 615 Fehl-Zeilen am 2026-08-15. Nur noch reviewed.
  const control = laneCells(streamOf({ cells: [cell()] }), "control")[0];
  expect(control).toMatchObject({ label: "bP", ledger: "reviewed" });

  const walled = streamOf({ boards: [board()] });
  const wall = laneCells(walled, "audit", {
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

test("ein Regelbruch haelt sein Brett offen und zaehlt sich nie fertig", () => {
  const broken = board({ violations: ["TOO_MANY_WHITE_PAWNS"], violating: { a1: "wP" } });
  // Highlighted, not proposed: the correction IS what is on file, so committing writes nothing and
  // a click cycles it against the FEN's word — which of the two fell is a look at the crop.
  expect(laneAccept(broken, "all")).toMatchObject({ a1: "wP" });
  // Its squares are judged by construction, so the ledger can never close this board — only a
  // re-run of `audit-corrections` drops the row.
  const every = Object.fromEntries(Object.keys(fenLabels(broken.fen)).map((sq) => [`000100|${sq}`, "empty"]));
  expect(laneOpen(broken, "all", every)).toBe(true);
  expect(boardCells([broken], "all")).toMatchObject([{ square: "a1", label: "wP", ledger: "corrections" }]);
});

test("a board lane is answerable crop by crop, which is what the phone renders", () => {
  const boards = [board({ disagree: { e5: "bP" }, disagreeReads: { e5: "bP 0.85" } })];
  expect(boardCells(boards, "all")).toEqual([
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

test("die Strittig-Lane traegt die Abfrage der Klassenwand mit, und sagt — solange nichts antwortet", () => {
  const stream = streamOf({
    sessions: [{ name: "g", sessionId: "rg-g", reads: true, probs: true, reportedDirty: [] }],
    boards: [board()],
    audit: [],
  });
  const wall = { cells: wallCells([hit({ squares: ["a1", "h1"], accept: { a1: "bB", h1: "bN" } })], stream), text: "bB ≥ 0.5" };
  expect(laneCount(stream, "audit", wall)).toMatchObject({ n: 2, total: 2 });
  // Der Nenner reist mit der Zahl: eine nackte 2 sagt nicht, welche Frage gestellt wurde.
  expect(laneChip(laneById("audit"), laneCount(stream, "audit", wall)).title).toContain("»bB ≥ 0.5«");
  const done = { ...stream, decided: [{ "000100|a1": "wR" }] };
  expect(laneCount(done, "audit", wall)).toMatchObject({ n: 1, total: 2 });
  // No answer is not "no work": the query is server-side and may simply not have come back.
  expect(laneCount(stream, "audit").denominator).toContain(NO_QUERY);
});

test("eine verdeckte Zelle ist keine Frage — der Verlust maskiert sie ohnehin", () => {
  const audit = (square: string) =>
    ({ session: 0, pos: 0, stem: "000100", square, fen_label: "bP", predicted: "bB", prob: 0.9, margin: 0.5 });
  const stream = streamOf({
    audit: [audit("e5"), audit("h1")],
    // e5 liegt unter einer Hand (`PIECE_VISIBLE_MAX` 0.15), h1 ist frei, a1 wurde nie gemessen.
    coverage: [{ "000100": { e5: 0.82, h1: 0.02 } }],
  });
  expect(laneCells(stream, "audit").map((c) => c.square)).toEqual(["h1"]);
  // Ungemessen heisst NICHT verdeckt: ohne Zahl bleibt die Zelle eine Frage.
  const unmeasured = streamOf({ audit: [audit("a1")], coverage: [{}] });
  expect(laneCells(unmeasured, "audit")).toHaveLength(1);
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

test("a board that can never yield a crop is not asked about", () => {
  const cover = [{ "000002": { h6: 0.9 } }];
  const board = (stem: string, phase: "settled" | "after", dirtyReason?: string) =>
    ({ session: 0, pos: 0, stem, ply: 1, fen: "x", phase, unknown: [], violations: [],
       disagree: {}, ...(dirtyReason ? { dirtyReason } : {}) }) as never;
  // Settled: always. Occluded WITH a matte: rescued by `slice_session`, so still worth asking.
  expect(reachesPool(board("000001", "settled"), cover)).toBe(true);
  expect(reachesPool(board("000002", "after", "occluded"), cover)).toBe(true);
  // Occluded without a matte, and every other dirty reason: the crop never reaches the pool.
  expect(reachesPool(board("000003", "after", "occluded"), cover)).toBe(false);
  expect(reachesPool(board("000002", "after", "stale"), cover)).toBe(false);
});

test("mit Settle-Messung rettet die Matte auch ein `stale` Brett — zellweise", () => {
  const cover = [{ "000002": { h6: 0.9 } }];
  const board = (measured: boolean) =>
    ({ session: 0, pos: 0, stem: "000002", ply: 1, fen: "x", phase: "after", unknown: [],
       violations: [], disagree: {}, dirtyReason: "stale", measured }) as never;
  // Der sichtbar ziehende Bauer: das Frame ist `stale`, aber 62 seiner Felder sind es nicht.
  expect(reachesPool(board(true), cover)).toBe(true);
  expect(reachesPool(board(false), cover)).toBe(false);
});

test("die Stellungs-Lane fragt nach der Figur, die wirklich dasteht", () => {
  const positions = [
    { session: 0, pos: 0, stem: "000100", square: "a3", fen_label: "empty", dev: 41.2, reason: "changed" },
  ];
  // Kein Producer: `—`, nie 0 — ungemessen ist nicht unstrittig.
  expect(laneCount(streamOf(), "audit").why).toContain(NO_POSITION);
  const cells = laneCells(streamOf({ positions }), "audit");
  expect(cells).toHaveLength(1);
  // ⏎ bestaetigt den FEN (Schatten-Fehlalarm), die Palette schreibt die Figur — in `corrections`,
  // denn hier ist der FEN der Verdaechtige und nicht ein Modell.
  expect(cells[0].label).toBe("empty");
  expect(cells[0].ledger).toBe("corrections");
  expect(cells[0].exception).toBeNull();
  expect(cells[0].note).toBe("Stellung? Δ 41");
});

test("eine kaum sichtbare Zelle sagt das, statt eine Abweichung zu behaupten", () => {
  const positions = [
    { session: 0, pos: 0, stem: "000100", square: "a3", fen_label: "wP", dev: 0, reason: "unreadable" },
  ];
  expect(laneCells(streamOf({ positions }), "audit")[0].note).toBe("Stellung? kaum Feld zu sehen");
});

test("temporal anomalies are review questions, not hand or coverage claims", () => {
  const positions = [{ session: 0, pos: 0, stem: "000100", square: "a3", fen_label: "wP",
    dev: 18, reason: "temporal", temporal_score: 0.432 }];
  const cells = laneCells(streamOf({ positions }), "audit");
  expect(cells).toHaveLength(1);
  expect(cells[0].note).toBe("Bildabweichung 0.43 · Hand oder Stellung prüfen");
  expect(cells[0].ledger).toBe("corrections");
  expect(cells[0].exception).toBeNull();
});

test("erst der Grund, dann die Klasse — eine Seite zeigt eine Frage an einer Figur", () => {
  const at = (square: string, reason: string, fen_label: string) =>
    ({ session: 0, pos: 0, stem: "000100", square, fen_label, dev: 50, reason });
  // Nach Feld sortiert lagen drei FRAGEN und alle Figuren auf einer Seite (User, 2026-09-12).
  const positions = [
    at("a1", "timing", "wQ"), at("a2", "changed", "wP"), at("a3", "timing", "wP"),
    at("a4", "timing", "wP"), at("a5", "temporal", "wP"), at("a6", "timing", "wQ"),
  ];
  const cells = laneCells(streamOf({ positions }), "audit");
  // `changed` vor `temporal` vor `timing`; darin die groesste Klasse zuerst (wP 2, dann wQ).
  expect(cells.map((c) => `${c.square}${c.fen_label}`)).toEqual([
    "a2wP", "a5wP", "a3wP", "a4wP", "a1wQ", "a6wQ",
  ]);
});

test("die Hand am Brett gilt der Karte nur, solange ihr eigenes Feld frei ist", () => {
  const hands = [{ "000100": { gate: 0.97, grid: ["e4", "e5"] } }];
  const at = (square: string) => ({ session: 0, stem: "000100", square });
  // Der Crop sieht frei aus, das Frame traegt trotzdem eine Hand — genau die unsichtbare Marke.
  expect(handBeside(hands, [{}], at("a1"))?.gate).toBe(0.97);
  // Verdeckt sagt die Coverage schon; zwei Marken fuer dieselbe Aussage sind eine zu viel.
  expect(handBeside(hands, [{ "000100": { a1: 0.8 } }], at("a1"))).toBeNull();
  // Kein Eintrag heisst hier nichts: ob gemessen wurde, sagt `handsMeasured`, nicht diese Zeile.
  expect(handBeside([{}], [{}], at("a1"))).toBeNull();
});

test("die Hand-Lane fragt nach der Hand, nicht nach der Klasse", () => {
  const hands = [{ session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "bP", cov: 0.82, measured: 0 }];
  // Kein Producer: `—`, nie 0 — sonst liest sich "nichts zu tun" wie "nichts gemessen".
  expect(laneCount(streamOf(), "audit").why).toContain(NO_HAND);
  const cells = laneCells(streamOf({ hands }), "audit");
  expect(cells).toHaveLength(1);
  // ⏎ bestaetigt das FEN-Wort ("keine Hand"); ein Klassenwort darf die Lane nie anbieten.
  expect(cells[0].label).toBe("bP");
  expect(cells[0].exception).toBeNull();
  expect(cells[0].caption).toContain("82 %");
  expect(cells[0].note).toContain("Matte");
});

test("eine Zelle ohne Matte-Eintrag sagt das, statt 0 % zu behaupten", () => {
  const hands = [{ session: 0, pos: 0, stem: "000100", square: "e5", fen_label: "empty", cov: 0.5, measured: null }];
  expect(laneCells(streamOf({ hands }), "audit")[0].note).toBe("Hand? Matte kennt dieses Frame nicht");
});

test("recentCells hands the ledger back as cells, newest first and with its own label", () => {
  const stream = streamOf({
    recent: [
      { session: 0, pos: 3, stem: "000300", square: "c3", fen_label: "empty", label: "bB", ledger: "corrections", ts: "2026-09-08T09:00:00+00:00" },
      { session: 0, pos: 1, stem: "000100", square: "e5", fen_label: "bP", label: "bP", ledger: "reviewed", ts: "2026-09-08T08:00:00+00:00" },
    ],
  });
  const cells = recentCells(stream);
  // The label is what STANDS, not the FEN word — repainting a correction must start from it.
  expect(cells.map((c) => [c.square, c.label, c.ledger])).toEqual([
    ["c3", "bB", "corrections"],
    ["e5", "bP", "reviewed"],
  ]);
  expect(cells[0].note).toContain("beurteilt");
});
