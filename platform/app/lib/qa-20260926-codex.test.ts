import { access, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { afterEach, expect, test, vi } from "vitest";
import { GET as matteGet } from "@/app/api/matte/[name]/[stem]/route";
import type { ChainState } from "@/lib/chain/chain";
import type { QueueRow } from "@/lib/chain/queues";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fault = vi.hoisted(() => ({ release: false }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    rm: async (file: string, options?: Parameters<typeof real.rm>[1]) => {
      if (fault.release && String(file).endsWith("heavy.lock")) throw new Error("release kaputt");
      return real.rm(file, options);
    },
  };
});

const fake = vi.hoisted(() => ({ rows: [] as QueueRow[] }));

vi.mock("@/lib/chain/chain", async (original) => ({
  ...(await original<typeof import("@/lib/chain/chain")>()),
  chainState: async () => fake.rows[0].chain,
}));
vi.mock("@/lib/chain/queues", async (original) => ({
  ...(await original<typeof import("@/lib/chain/queues")>()),
  queueRows: async () => fake.rows,
}));
vi.mock("@/lib/chain/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/chain/jobs")>()),
  enqueueChain: async () => { throw new Error("enqueue kaputt"); },
  jobs: async () => [],
  lastByStep: async () => new Map(),
}));

const { startDrain } = await import("@/lib/chain/drain");
const { heavyLockPath } = await import("@/lib/chain/heavy-lock");

const chain: ChainState = {
  step: "export", video: "video.mp4", videoBroken: null, offeredPgn: null,
  hasReference: true, hasPhoneRecord: false, hasCandidate: true, confirmed: true,
  hasSession: true, hasSettle: false, hasTemporalPass: false, hasModelReads: false,
  mattes: { done: 0, total: 0, target: 0, reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
  outdated: {}, reason: "", useless: null,
};

afterEach(async () => {
  fault.release = false;
  await rm(heavyLockPath(), { force: true });
});

test("startDrain gibt den Heavy-Slot frei, wenn der Einreiher wirft", async () => {
  await tempDataRoot("qa-20260926-drain-release");
  fake.rows = [{ name: "g", title: null, plies: 0, frames: 0, archived: false, chain }];

  await expect(startDrain("export")).rejects.toThrow("enqueue kaputt");

  await expect(access(heavyLockPath())).rejects.toMatchObject({ code: "ENOENT" });
});

test("wirft auch die Freigabe, nennt der Drain-Fehler die liegengebliebene heavy.lock", async () => {
  await tempDataRoot("qa-20260926-drain-release-fails");
  fake.rows = [{ name: "g", title: null, plies: 0, frames: 0, archived: false, chain }];
  fault.release = true;

  const failure = startDrain("export");

  await expect(failure, "BUG: die Freigabe scheitert still, die Sperre blockiert jeden Python-Lauf").rejects.toThrow(/enqueue kaputt.*heavy\.lock bleibt liegen.*release kaputt/);
});

test("eine laut matte.jsonl erzeugte, spaeter verlorene Alpha-Datei ist 500", async () => {
  const root = await tempDataRoot("qa-20260926-missing-alpha");
  const dir = await writeSession({ root, name: "g", rows: [{ frame: 1 }] });
  await mkdir(path.join(dir, "boards"), { recursive: true });
  const board = await sharp({ create: { width: 928, height: 928, channels: 3, background: "white" } }).webp().toBuffer();
  await writeFile(path.join(dir, "boards", "000001.webp"), board);
  await writeFile(path.join(dir, "matte.jsonl"), `${JSON.stringify({ frame: "000001", coverage: { e4: 0.4 }, source: "sam" })}\n`);

  const response = await matteGet(new Request("http://x/api/matte/g/000001"), {
    params: Promise.resolve({ name: "g", stem: "000001" }),
  });

  expect(response.status, "BUG: verlorenes Ergebnis eines abgeschlossenen SAM-Laufs wird als legitimes Fehlen gemeldet").toBe(500);
});
