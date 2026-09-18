import { describe, expect, it } from "vitest";
import { pagesByClaim } from "@/lib/lane-pages";
import type { LaneCell } from "@/lib/lanes";

const cell = (fen_label: string, square: string): LaneCell =>
  ({ session: 0, pos: 0, stem: "s", square, fen_label, label: fen_label,
     ledger: "reviewed", exception: null, caption: "" }) as unknown as LaneCell;

describe("pagesByClaim", () => {
  it("never mixes two claims on one page", () => {
    const pages = pagesByClaim([cell("wB", "a1"), cell("wB", "a2"), cell("wN", "a3")], 50);
    expect(pages.map((p) => p.map((c) => c.fen_label))).toEqual([["wB", "wB"], ["wN"]]);
  });

  it("still breaks a long claim at the page size", () => {
    const many = Array.from({ length: 7 }, (_, i) => cell("wP", `a${i}`));
    expect(pagesByClaim(many, 3).map((p) => p.length)).toEqual([3, 3, 1]);
  });

  it("keeps the order it was given", () => {
    const pages = pagesByClaim([cell("wB", "h8"), cell("wB", "a1")], 50);
    expect(pages[0].map((c) => c.square)).toEqual(["h8", "a1"]);
  });

  it("returns no page for no cells", () => {
    expect(pagesByClaim([], 50)).toEqual([]);
  });

  it("gives a lone claim its own page rather than padding it", () => {
    const pages = pagesByClaim([cell("wB", "a1"), cell("wQ", "a2"), cell("wB", "a3")], 50);
    expect(pages.map((p) => p.length)).toEqual([1, 1, 1]);
  });
});
