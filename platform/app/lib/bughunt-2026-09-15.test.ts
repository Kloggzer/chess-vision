/** `forgetRaster` wirft nichts weg: sein Schluessel traegt die mtime, der Aufruf nicht. */
import { expect, test, vi } from "vitest";

const sharpCalls = vi.hoisted(() => ({ decodes: 0 }));

vi.mock("sharp", () => {
  const raster = { data: Buffer.alloc(4 * 4 * 3), info: { width: 4, height: 4, channels: 3 } };
  const api = {
    removeAlpha: () => api,
    raw: () => api,
    webp: () => api,
    toBuffer: (opts?: unknown) => {
      if (opts) {
        sharpCalls.decodes += 1;
        return Promise.resolve(raster);
      }
      return Promise.resolve(Buffer.alloc(3));
    },
    metadata: () => Promise.resolve({ width: 4, height: 4 }),
  };
  return { default: () => api };
});

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
  readFile: () => Promise.resolve(Buffer.alloc(1)),
  stat: () => Promise.resolve({ mtimeMs: 7 }),
}));

vi.mock("@/lib/session-store/matte", async (original) => ({
  ...(await original<typeof import("@/lib/session-store/matte")>()),
  alphaPath: () => Promise.resolve("/x/alpha.png"),
}));

vi.mock("@/lib/session-store/session", async (original) => ({
  ...(await original<typeof import("@/lib/session-store/session")>()),
  loadSession: () =>
    Promise.resolve({
      boardSize: 8,
      byStem: new Map([["000001", { board: { rel: "boards/a.webp", straightened: true } }]]),
    }),
  boardToStored: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
}));

const { forgetRaster, mattePng } = await import("@/lib/session-store/crops");

test("forgetRaster throws the raster out — its key carries the mtime, the call does not", async () => {
  await mattePng("g", "000001", 4);
  const after = sharpCalls.decodes;
  await mattePng("g", "000001", 4);
  expect(sharpCalls.decodes, "zweiter Aufruf kam aus dem Cache").toBe(after);

  forgetRaster("/x/alpha.png");
  await mattePng("g", "000001", 4);
  expect(sharpCalls.decodes, "nach forgetRaster wurde NICHT neu dekodiert").toBe(after + 1);
});

