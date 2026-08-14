import { expect, test } from "vitest";
import { buildGalleryCards, buildReviewCards, type ReviewMove } from "@/lib/review-cards";
import type { FrameStem } from "@/lib/data";

/** Review frames as they lie on disk: one per commit window, `labeled` like the burst PNGs. */
const stems = (...ns: number[]): FrameStem[] =>
  ns.map((n) => ({ stem: String(n).padStart(6, "0"), kind: "labeled" as const }));

/**
 * `VID_20260726_233432` shrunk to its bridge: the recovery landed `e4` AND `Nf6` on frame 455,
 * so the only picture that exists there shows the position after BOTH.
 */
const BRIDGE: ReviewMove[] = [
  {
    ply: 1,
    san: "e5",
    frame: 335,
    decider: "cnn_pair",
    fen_after: "rnbqkbnr/pppp1ppp/8/4p3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 2",
  },
  {
    ply: 2,
    san: "e4",
    frame: 455,
    decider: "cnn_recovery",
    fen_after: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 2",
  },
  {
    ply: 3,
    san: "Nf6",
    frame: 455,
    decider: "cnn_recovery",
    fen_after: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 3",
  },
  {
    ply: 4,
    san: "Nxe5",
    frame: 541,
    decider: "cnn_occupancy",
    fen_after: "rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3",
  },
];

/** `2026-08-14-20-48-55`: recoveries too, but every one of them on a frame of its own. */
const SINGLES: ReviewMove[] = [
  {
    ply: 1,
    san: "e4",
    frame: 133,
    decider: "cnn_recovery",
    fen_after: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  },
  {
    ply: 2,
    san: "e5",
    frame: 245,
    decider: "cnn_occupancy",
    fen_after: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  },
  {
    ply: 3,
    san: "Nf3",
    frame: 395,
    decider: "cnn_occupancy",
    fen_after: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
  },
];

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

test("plies sharing a commit frame become ONE card with one frame series", () => {
  const cards = buildReviewCards({
    moves: BRIDGE,
    indices: [0, 1, 2, 3],
    stems: stems(334, 335, 400, 455, 456, 500, 541),
    startFen: START,
  });

  expect(cards.map((c) => c.plies.map((p) => p.san))).toEqual([["e5"], ["e4", "Nf6"], ["Nxe5"]]);
  const bridge = cards[1];
  expect(bridge.frame).toBe(455);
  // The window runs to the NEXT commit, not to the frame-mate — one series, shown once.
  expect(bridge.stems.map((s) => Number(s.stem))).toEqual([455, 456, 500]);
  expect(bridge.stems[bridge.start].stem).toBe("000455");
  expect(bridge.carriesFrames).toBe(true);
});

test("the bridge keeps only the ply that owns the interval — the halves drop as before", () => {
  const [, bridge] = buildReviewCards({
    moves: BRIDGE,
    indices: [0, 1, 2, 3],
    stems: stems(455),
    startFen: START,
  });
  // `known_segments` skips ply 2 (`end <= start`), so a kept card names ply 3 alone; ply 2 is
  // reviewed-and-dropped, exactly what the per-ply card marked "trägt 0 Frames bei" produced.
  expect(bridge.keep).toEqual([2]);
  expect(bridge.plies.map((p) => p.index)).toEqual([1, 2]);
  expect(bridge.id).toBe(1);
});

test("both halves of the bridge get their own arrow off the tracker's own chain", () => {
  const [bridge] = buildReviewCards({
    moves: BRIDGE,
    indices: [1, 2],
    stems: stems(455),
    startFen: START,
  });
  expect(bridge.plies.map((p) => p.squares)).toEqual([
    { from: "e2", to: "e4" },
    { from: "g8", to: "f6" },
  ]);
});

test("single-ply commits stay one card each", () => {
  const cards = buildReviewCards({
    moves: SINGLES,
    indices: [0, 1, 2],
    stems: stems(133, 200, 245, 300, 395),
    startFen: START,
    missedSans: new Set(["e5"]),
  });

  expect(cards.map((c) => c.plies.length)).toEqual([1, 1, 1]);
  expect(cards.map((c) => c.keep)).toEqual([[0], [1], [2]]);
  expect(cards.map((c) => c.frame)).toEqual([133, 245, 395]);
  expect(cards[0].stems.map((s) => Number(s.stem))).toEqual([133, 200]);
  expect(cards[0].decider).toBe("cnn_recovery");
  expect(cards[1].duplicate).toBe(true);
  // The last commit has no next one, but `known_segments` grants it LAST_INTERVAL_S after the
  // commit — keeping it DOES export frames, and the card must not claim otherwise.
  expect(cards[2].carriesFrames).toBe(true);
  expect(cards[2].keep).toEqual([2]);
});

test("a frame-mate the reference already matched shows up as context, not as a second card", () => {
  const cards = buildReviewCards({
    moves: BRIDGE,
    indices: [1],
    stems: stems(455),
    startFen: START,
  });
  expect(cards).toHaveLength(1);
  expect(cards[0].group).toEqual(["e4", "Nf6"]);
  expect(cards[0].plies).toHaveLength(1);
  // Nothing under review owns the interval here, so the ply itself is posted — the pre-collapse
  // wire for exactly this card.
  expect(cards[0].carriesFrames).toBe(false);
  expect(cards[0].keep).toEqual([1]);
});

test("a game that matches its reference still has every commit series to look at", () => {
  // `2026-08-14-21-01-04`: reference.pgn matches every ply, so nothing is invented — and the page
  // showed the human NOTHING. The gallery is those same windows, read-only.
  const gallery = buildGalleryCards({
    moves: SINGLES,
    matched: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    stems: stems(133, 200, 245, 300, 395),
    startFen: START,
  });

  expect(buildReviewCards({ moves: SINGLES, indices: [], stems: stems(133) })).toEqual([]);
  expect(gallery.map((c) => c.plies.map((p) => p.san))).toEqual([["e4"], ["e5"], ["Nf3"]]);
  expect(gallery.map((c) => c.stems.length)).toEqual([2, 2, 1]);
  expect(gallery[0].plies[0].squares).toEqual({ from: "e2", to: "e4" });
});

test("the gallery groups a matched multi-commit exactly like a review card", () => {
  const gallery = buildGalleryCards({
    moves: BRIDGE,
    // Out of order on purpose: `lcsReport` yields pairs, the gallery must read chronologically.
    matched: [
      [1, 2],
      [0, 1],
    ],
    stems: stems(455, 456, 541),
    startFen: START,
  });
  expect(gallery).toHaveLength(1);
  expect(gallery[0].plies.map((p) => p.san)).toEqual(["e4", "Nf6"]);
  expect(gallery[0].stems.map((s) => Number(s.stem))).toEqual([455, 456]);
});

test("a pre-pair-fix row is one collapsed card, not a group", () => {
  const [collapsed] = buildReviewCards({
    // `Nf3 e5` in ONE row: the san cannot be replayed from the start position.
    moves: BRIDGE,
    indices: [0],
    stems: stems(335),
    startFen: START,
  });
  expect(collapsed.plies[0].squares).toBeNull();
  expect(collapsed.collapsed).toBe(true);
});
