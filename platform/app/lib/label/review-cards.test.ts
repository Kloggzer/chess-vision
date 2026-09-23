import { expect, test } from "vitest";
import {
  buildGalleryCards,
  buildReviewCards,
  type ReviewMove,
} from "@/lib/label/review-cards";
import type { FrameStem } from "@/lib/session-store/recordings";

const stems = (...ns: number[]): FrameStem[] =>
  ns.map((n) => ({
    stem: String(n).padStart(6, "0"),
    kind: "labeled" as const,
    width: 720,
    height: 816,
  }));

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
    fen_after:
      "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 1 3",
  },
  {
    ply: 4,
    san: "Nxe5",
    frame: 541,
    decider: "cnn_occupancy",
    fen_after: "rnbqkb1r/pppp1ppp/5n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3",
  },
];

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

  expect(cards.map((c) => c.plies.map((p) => p.san))).toEqual([
    ["e5"],
    ["e4", "Nf6"],
    ["Nxe5"],
  ]);
  const bridge = cards[1];
  expect(bridge.frame).toBe(455);
  // Back to the PREVIOUS commit, because the phone writes its review burst just BEFORE a commit:
  // 400 is this card's own evidence, not the last card's. It still OPENS at the nearest stem.
  expect(bridge.stems.map((s) => Number(s.stem))).toEqual([400, 455, 456, 500]);
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
  expect(cards[2].carriesFrames).toBe(true);
  expect(cards[2].keep).toEqual([2]);
});

test("every card names the picture its move started from", () => {
  const cards = buildReviewCards({
    moves: SINGLES,
    indices: [0, 1, 2],
    stems: stems(133, 200, 245, 300, 395),
    startFen: START,
    missedSans: new Set(["e5"]),
  });

  // The PREVIOUS commit, not two frames back (still mid-move). The FIRST card gets one only where the
  // review set reaches before the opening commit — here it starts on it, so there is nothing earlier.
  expect(cards.map((c) => c.before?.stem ?? null)).toEqual([
    null,
    "000133",
    "000245",
  ]);
  // Never a frame at or after its own commit — that would show the answer instead of the question.
  for (const card of cards) {
    if (card.before) expect(Number(card.before.stem)).toBeLessThan(card.frame);
  }
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
  expect(cards[0].carriesFrames).toBe(false);
  expect(cards[0].keep).toEqual([1]);
});

test("a game that matches its reference still has every commit series to look at", () => {
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

  expect(
    buildReviewCards({ moves: SINGLES, indices: [], stems: stems(133) }),
  ).toEqual([]);
  expect(gallery.map((c) => c.plies.map((p) => p.san))).toEqual([
    ["e4"],
    ["e5"],
    ["Nf3"],
  ]);
  expect(gallery.map((c) => c.stems.length)).toEqual([2, 3, 2]);
  // Every card opens on the frame nearest its own commit — widening the reach must not move that.
  expect(gallery.map((c) => c.stems[c.start].stem)).toEqual([
    "000133",
    "000245",
    "000395",
  ]);
  expect(gallery[0].plies[0].squares).toEqual({ from: "e2", to: "e4" });
});

test("the gallery groups a matched multi-commit exactly like a review card", () => {
  const gallery = buildGalleryCards({
    moves: BRIDGE,
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
    moves: BRIDGE,
    indices: [0],
    stems: stems(335),
    startFen: START,
  });
  expect(collapsed.plies[0].squares).toBeNull();
  expect(collapsed.collapsed).toBe(true);
});

test("a card shows the burst its own commit was decided from, not the next one's", () => {
  // The phone writes five frames ~20 before each commit; cutting at `frame - 2` left commit 238 with
  // the NEXT commit's burst, and the card looked like a double move.
  const moves: ReviewMove[] = [
    {
      ply: 2,
      san: "e5",
      frame: 168,
      decider: "cnn_occupancy",
      fen_after: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    },
    {
      ply: 3,
      san: "Nf3",
      frame: 238,
      decider: "cnn_occupancy",
      fen_after:
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    },
    {
      ply: 4,
      san: "Nf6",
      frame: 317,
      decider: "cnn_occupancy",
      fen_after:
        "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    },
  ];
  const [, nf3] = buildReviewCards({
    moves,
    indices: [0, 1, 2],
    stems: stems(142, 146, 216, 220, 296, 300),
    startFen: START,
  });

  expect(nf3.frame).toBe(238);
  expect(nf3.stems[nf3.start].stem).toBe("000220");
  expect(nf3.stems.map((s) => Number(s.stem))).toEqual([216, 220, 296, 300]);
});

/** 16-20-19: ply 7 committed at 291, plies 8+9 at 295 — the position after 7 never stood still. */
test("a card says how long its position stood, and the last one does not know", () => {
  const moves: ReviewMove[] = [
    { ply: 7, san: "Nxe5", frame: 291, fen_after: BRIDGE[3].fen_after },
    { ply: 8, san: "Nxe5", frame: 295 },
    { ply: 9, san: "dxe5", frame: 295 },
  ];
  const cards = buildReviewCards({
    moves,
    indices: [0, 1, 2],
    stems: stems(289, 291, 295, 300),
  });
  expect(cards.map((c) => c.held)).toEqual([4, null]);
});

test("a retimed move opens on its review picture, not on the frame the position entered", () => {
  const moves: ReviewMove[] = [
    { ply: 1, san: "e4", frame: 100, frame_review: 130 },
    { ply: 2, san: "e5", frame: 200, frame_review: 240 },
  ];
  const cards = buildReviewCards({
    moves,
    indices: [0, 1],
    stems: stems(98, 99, 100, 129, 130, 131, 199, 200, 239, 240, 241),
  });
  expect(cards[0].frame).toBe(100);
  expect(cards[0].stems[cards[0].start].stem).toBe("000130");
  expect(cards[1].stems[cards[1].start].stem).toBe("000240");
  // The previous card's picture is where this move started from.
  expect(cards[1].before?.stem).toBe("000130");
});

test("a retimed card shows only its own frames, never the previous position's tail", () => {
  const moves: ReviewMove[] = [
    { ply: 1, san: "Rc6+", frame: 100, frame_review: 300 },
    { ply: 2, san: "Kg7", frame: 340, frame_review: 700 },
  ];
  const cards = buildReviewCards({
    moves,
    indices: [0, 1],
    stems: stems(298, 299, 300, 301, 302, 698, 699, 700, 701, 702),
  });
  expect(cards[1].stems.map((s) => s.stem)).toEqual([
    "000698",
    "000699",
    "000700",
    "000701",
    "000702",
  ]);
  expect(cards[1].stems[cards[1].start].stem).toBe("000700");
});
