import { describe, expect, it } from "vitest";
import type { ReviewCard } from "@/lib/review-cards";
import { median, nextItem, prevItem, streamItems, type StreamGame } from "@/lib/zuege";

const card = (id: number): ReviewCard => ({
  id,
  plies: [{ index: id, ply: id + 1, san: "e4", squares: null }],
  frame: 100 + id,
  stems: [],
  start: 0,
  before: null,
  keep: [id],
  group: ["e4"],
  carriesFrames: true,
  collapsed: false,
  decider: null,
  duplicate: false,
  held: null,
});

const game = (name: string, cards: number): StreamGame => ({
  name,
  title: null,
  sessionId: `rg-${name}`,
  plies: cards,
  cards: Array.from({ length: cards }, (_, i) => card(i)),
  gallery: [],
  reference: "phone",
  noted: [],
  referenceProblem: null,
});

describe("streamItems", () => {
  it("concatenates the games and marks each one's last card as the boundary", () => {
    const items = streamItems([game("a", 2), game("b", 1)]);
    expect(items).toEqual([
      { game: 0, card: expect.objectContaining({ id: 0 }), last: false },
      { game: 0, card: expect.objectContaining({ id: 1 }), last: true },
      { game: 1, card: expect.objectContaining({ id: 0 }), last: true },
    ]);
  });

  it("gives an empty candidate ONE card — the backlog is four of those (§4.1)", () => {
    const items = streamItems([game("a", 0), game("b", 1)]);
    expect(items[0]).toEqual({ game: 0, card: null, last: true });
    expect(items).toHaveLength(2);
  });
});

describe("nextItem / prevItem", () => {
  const items = streamItems([game("a", 2), game("b", 2), game("c", 1)]);

  it("walks card by card and ends past the last one", () => {
    expect(nextItem(items, 0, new Set())).toBe(1);
    expect(nextItem(items, 4, new Set())).toBe(items.length);
  });

  it("skips every remaining card of a game thrown out with x", () => {
    // Standing on b's first card when `x` lands: the rest of b is answered, c is not.
    expect(nextItem(items, 2, new Set([1]))).toBe(4);
  });

  it("steps back across the game boundary and stops at the head", () => {
    expect(prevItem(items, 2, new Set())).toBe(1);
    expect(prevItem(items, 0, new Set())).toBe(-1);
  });

  it("never steps back INTO a game that was thrown out", () => {
    expect(prevItem(items, 4, new Set([1]))).toBe(1);
  });
});

describe("median", () => {
  it("is null before anything was decided", () => {
    expect(median([])).toBeNull();
  });

  it("averages the two middle gaps on an even count", () => {
    expect(median([10, 2, 6, 4])).toBe(5);
    expect(median([9, 1, 5])).toBe(5);
  });
});
