import { expect, test, vi } from "vitest";

// Dieselbe Regel wie `api/cell`: ENOENT -> 404, alles andere -> 500, beides mit Grund im Rumpf.
const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/verify", () => ({ loadVerifyStream: load }));

const get = async () => {
  const { GET } = await import("@/app/api/verify/route");
  return GET(new Request("http://local/api/verify"));
};

test("a missing file is 404 with the reason in the body", async () => {
  load.mockRejectedValueOnce(Object.assign(new Error("ENOENT: matte.jsonl"), { code: "ENOENT" }));
  const answer = await get();
  expect(answer.status).toBe(404);
  expect((await answer.json()).error).toMatch(/matte\.jsonl/);
});

test("anything else is 500, and says what it was", async () => {
  load.mockRejectedValueOnce(new Error("sharp: bad raster"));
  const answer = await get();
  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/bad raster/);
});

test("the stream itself still comes through untouched", async () => {
  load.mockResolvedValueOnce({ sessions: [], frames: [], progress: { frames: 0, done: 0, open: 0 } });
  expect((await get()).status).toBe(200);
});
