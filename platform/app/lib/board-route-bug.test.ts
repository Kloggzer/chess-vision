import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  boardPng: vi.fn(),
  storedBoardPng: vi.fn(),
}));

vi.mock("@/lib/crops", () => ({ boardPng: mocks.boardPng, CUT_MIME: "image/webp" }));
vi.mock("@/lib/stored", () => ({ storedBoardPng: mocks.storedBoardPng }));

import { GET } from "@/app/api/board/[name]/[stem]/route";

describe("GET /api/board/[name]/[stem] source integrity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not hide an exported-board failure by serving a different stored-phone image", async () => {
    mocks.boardPng.mockRejectedValueOnce(new Error("exported board is corrupt"));
    mocks.storedBoardPng.mockResolvedValueOnce(Buffer.from("different pixels"));

    const response = await GET(new Request("http://local/api/board/game/000001"), {
      params: Promise.resolve({ name: "game", stem: "000001" }),
    });

    // 500 seit 2026-09-21: die Route unterscheidet "nicht da" (404) von "kaputt" wie `api/cell`.
    // Der Befund dieses Tests ist ein anderer — es duerfen keine Ersatzpixel geliefert werden.
    expect(
      response.status,
      "BUG: /api/board returned 200 with fallback pixels after the authoritative exported board failed",
    ).toBe(500);
    expect(mocks.storedBoardPng).not.toHaveBeenCalled();
  });
});
