/**
 * `model-read` verlangt `--model` und weist ein Modell zurueck, das auf dieser Aufnahme trainiert
 * hat. Ohne Wahl ist das eine Frage an einen Menschen, kein gescheiterter Job: die Tuer weist den
 * Druck ab, statt einen Prozess zu starten, der nach Sekunden mit Exit 2 zurueckkommt.
 */
import { beforeEach, expect, test, vi } from "vitest";
import type { ChainState } from "@/lib/chain";
import { tempDataRoot } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ run: null as string | null, enqueue: vi.fn(), state: {} as ChainState }));
vi.mock("@/lib/chain", () => ({ chainState: async () => fake.state }));
vi.mock("@/lib/jobs", () => ({
  runningJob: () => null,
  enqueueChain: fake.enqueue,
  enqueueLabel: fake.enqueue,
  enqueuePhoneRecord: fake.enqueue,
  modelReadRun: () => fake.run,
}));

const { refused, startStep } = await import("@/lib/chain-run");
const { readHeavyLock } = await import("@/lib/heavy-lock");

beforeEach(async () => {
  await tempDataRoot("model-choice");
  fake.run = null;
  fake.enqueue.mockReset().mockResolvedValue({ name: "x", state: "queued", queuedAt: "" });
  fake.state = { step: "model-read", hasCandidate: true } as ChainState;
});

test("ohne gewaehltes Modell wird abgewiesen — kein Prozess, kein Riegel", async () => {
  const result = await startStep("2026-09-21-13-00-00", "model-read");

  expect(refused(result) && result.status).toBe(409);
  expect(refused(result) && result.error).toContain("CHESSLAB_MODEL_READ_RUN");
  expect(fake.enqueue).not.toHaveBeenCalled();
  expect(await readHeavyLock()).toBeNull();
});

test("mit Wahl geht derselbe Druck durch", async () => {
  fake.run = "data/runs/other";
  expect(refused(await startStep("2026-09-21-13-00-00", "model-read"))).toBe(false);
  expect(fake.enqueue).toHaveBeenCalled();
});
