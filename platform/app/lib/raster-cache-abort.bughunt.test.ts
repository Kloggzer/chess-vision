// Verdraengt der Byte-Deckel eine laufende Dekodierung, bricht `lru-cache` sie ab: ein 500 statt Pixel.
import { expect, test, vi } from "vitest";

const gate = vi.hoisted(() => ({ release: new Map<string, () => void>() }));

vi.mock("sharp", () => {
  const api = (file: Buffer & { path?: string }) => ({
    removeAlpha: () => api(file),
    raw: () => api(file),
    webp: () => api(file),
    toBuffer: (opts?: unknown) => {
      if (!opts) return Promise.resolve(Buffer.alloc(3));
      const tag = String(file);
      return new Promise((resolve) => {
        gate.release.set(tag, () =>
          resolve({ data: Buffer.alloc(100 * 1024 * 1024), info: { width: 4, height: 4, channels: 3 } }));
      });
    },
    metadata: () => Promise.resolve({ width: 4, height: 4 }),
  });
  return { default: api };
});

vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
  readFile: (p: string) => Promise.resolve(Buffer.from(p)),
  stat: () => Promise.resolve({ mtimeMs: 7 }),
}));

vi.mock("@/lib/matte", async (original) => ({
  ...(await original<typeof import("@/lib/matte")>()),
  alphaPath: (_n: string, stem: string) => Promise.resolve(`/x/${stem}.png`),
}));

vi.mock("@/lib/session", async (original) => ({
  ...(await original<typeof import("@/lib/session")>()),
  loadSession: () =>
    Promise.resolve({
      boardSize: 8,
      byStem: new Map(["000001", "000002", "000003", "000004"].map((s) => [s, { board: { rel: "b.webp", straightened: true } }])),
    }),
  boardToStored: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
}));

const { mattePng } = await import("@/lib/crops");

test("ein Byte-Deckel darf eine laufende Dekodierung nicht zum Fehler machen", async () => {
  const first = mattePng("g", "000001", 4).then(() => "ok", (e: Error) => `REJECT ${e.message}`);
  await vi.waitFor(() => expect(gate.release.has("/x/000001.png")).toBe(true));

  for (const stem of ["000002", "000003", "000004"]) {
    void mattePng("g", stem, 4).catch(() => undefined);
    await vi.waitFor(() => expect(gate.release.has(`/x/${stem}.png`)).toBe(true));
    gate.release.get(`/x/${stem}.png`)!();
    await new Promise((r) => setTimeout(r, 0));
  }
  gate.release.get("/x/000001.png")!();

  expect(await first, "die wartende Anfrage wurde vom Deckel abgebrochen statt nur nicht zwischengespeichert")
    .toBe("ok");
});
