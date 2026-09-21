/**
 * Die Zeile, die der Slot wirklich baut — `job.command` aus dem Ledger, nicht die reine Funktion.
 * Das `rg-` von `settle-scan`, die Mitfahrer des Matte-Stapels und der Vorrang von `--reported`
 * hingen bisher an keiner Probe; ein Lauf faellt darauf erst nach Minuten herein.
 */
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ census: vi.fn() }));
vi.mock("@/lib/matte", () => ({ matteCensus: fake.census, matteTarget: () => 80 }));

const { enqueueChain, lastByStep, whenIdle } = await import("@/lib/jobs");

const NAME = "2026-09-21-09-00-00";
const OTHER = "2026-09-21-09-30-00";

beforeEach(async () => {
  await tempDataRoot("job-command");
  process.env.CHESSLAB_UV = "chesslab-no-such-binary-2026-09-21.exe";
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  fake.census.mockReset().mockResolvedValue({ reportedOpen: 0, wanted: 0 });
});

async function commandOf(name: string, step: "settle-scan" | "matte" | "model-read", also: string[] = []): Promise<string> {
  await enqueueChain(name, step, also);
  await whenIdle();
  return (await lastByStep()).get(`${name}|${step}`)?.command ?? "";
}

test("settle-scan bekommt die SESSION-Id, nicht den Verzeichnisnamen", async () => {
  expect(await commandOf(NAME, "settle-scan")).toContain(`session settle-scan rg-${NAME}`);
});

test("die Mitfahrer des Matte-Stapels stehen mit auf der Zeile", async () => {
  expect(await commandOf(NAME, "matte", [OTHER])).toContain(`alpha-worker ${NAME} ${OTHER} --limit 80`);
});

test("eine offene Meldung schlaegt den Wunsch und der Wunsch den Stapel", async () => {
  fake.census.mockResolvedValue({ reportedOpen: 2, wanted: 5 });
  expect(await commandOf(NAME, "matte")).toMatch(/--reported$/);

  fake.census.mockResolvedValue({ reportedOpen: 0, wanted: 5 });
  expect(await commandOf(OTHER, "matte")).toMatch(/--wanted$/);
});

test("das Modell steht auf der Zeile, sobald eines gewaehlt ist", async () => {
  process.env.CHESSLAB_MODEL_READ_RUN = "data/runs/p4a-80-clahe";
  expect(await commandOf(NAME, "model-read")).toContain("--model data/runs/p4a-80-clahe");
});

test("wirft der Vorflug, ist der Job FAILED und nicht fuer immer running", async () => {
  fake.census.mockRejectedValue(new Error("matte.jsonl kaputt"));
  await enqueueChain(OTHER, "matte");
  await whenIdle();
  const row = (await lastByStep()).get(`${OTHER}|matte`);
  expect(row?.state).toBe("failed");
  expect(row?.reason).toContain("matte.jsonl kaputt");
});
