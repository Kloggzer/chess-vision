import { describe, expect, it, vi } from "vitest";
import { carryPositionCorrections, verifyFrameKey } from "@/lib/position-carry";
import { planBoard } from "@/lib/selection";

const frames = [
  { session: 0, stem: "f1", ply: 12 },
  { session: 0, stem: "f2", ply: 12 },
  { session: 0, stem: "f3", ply: 12 },
  { session: 0, stem: "f4", ply: 13 },
  { session: 1, stem: "f5", ply: 12 },
];

describe("position carry", () => {
  it("prefills later frames of the same session and ply only", () => {
    const result = carryPositionCorrections({
      frames,
      from: 0,
      corrections: [{ square: "e4", label: "wP" }],
      decided: [{}, {}],
      current: {},
    });

    expect(result.prefilled[verifyFrameKey(frames[1])]).toEqual({ e4: "wP" });
    expect(result.prefilled[verifyFrameKey(frames[2])]).toEqual({ e4: "wP" });
    expect(result.prefilled[verifyFrameKey(frames[3])]).toBeUndefined();
    expect(result.prefilled[verifyFrameKey(frames[4])]).toBeUndefined();
    expect(result.count).toBe(2);
  });

  it("replaces the previous carry after a later human decision", () => {
    const first = carryPositionCorrections({
      frames,
      from: 0,
      corrections: [
        { square: "e4", label: "wP" },
        { square: "f4", label: "wN" },
      ],
      decided: [{}, {}],
      current: {},
    });

    const second = carryPositionCorrections({
      frames,
      from: 1,
      corrections: [{ square: "e4", label: "bK" }],
      decided: [{}, {}],
      current: first.prefilled,
    });

    expect(second.prefilled[verifyFrameKey(frames[2])]).toEqual({ e4: "bK" });
  });

  it("does not propose a square already decided for the target stem", () => {
    const result = carryPositionCorrections({
      frames,
      from: 0,
      corrections: [
        { square: "e4", label: "wP" },
        { square: "f4", label: "wN" },
      ],
      decided: [{ "f2|e4": "bP" }, {}],
      current: {},
    });

    expect(result.prefilled[verifyFrameKey(frames[1])]).toEqual({ f4: "wN" });
    expect(result.prefilled[verifyFrameKey(frames[2])]).toEqual({ e4: "wP", f4: "wN" });
  });

  it("human paint wins over the carried value", () => {
    const plan = planBoard({
      squares: ["e4"],
      proposals: {},
      prefilled: { e4: "wP" },
      painted: { e4: "bK" },
      base: { e4: "empty" },
      onFile: { e4: "empty" },
    });

    expect(plan.labels.e4).toBe("bK");
    expect(plan.corrections).toEqual([{ square: "e4", label: "bK" }]);
    expect(plan.paintRows).toEqual([{ square: "e4", label: "bK" }]);
  });

  it("prefilling itself performs no post", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    try {
      carryPositionCorrections({
        frames,
        from: 0,
        corrections: [{ square: "e4", label: "wP" }],
        decided: [{}, {}],
        current: {},
      });

      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not carry an alpha verdict", () => {
    const result = carryPositionCorrections({
      frames,
      from: 0,
      corrections: [{ square: "e4", label: "wP" }],
      decided: [{}, {}],
      current: {},
    });

    expect(Object.keys(result).sort()).toEqual(["count", "prefilled"]);
    expect(JSON.stringify(result)).not.toContain("matte-ok");
    expect(JSON.stringify(result)).not.toContain("matte-bad");
  });
});