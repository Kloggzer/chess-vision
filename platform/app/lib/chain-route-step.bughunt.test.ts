import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

/**
 * Fehlt `step` im Rumpf, machte `String(body.step)` daraus die Zeichenkette "undefined" — und
 * genau die stand dann in der 409-Meldung, die ein Mensch liest.
 */
beforeEach(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "chesslab-chain-step-"));
  process.env.CHESSLAB_DATA_DIR = dir;
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
});

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/chain/[name]/route");
  return POST(new Request("http://local/api/chain/g", { method: "POST", body: JSON.stringify(body) }),
              { params: Promise.resolve({ name: "g" }) });
};

test("a body without a step is a bad request, not a conflict about \"undefined\"", async () => {
  const answer = await post({});
  const { error } = (await answer.json()) as { error: string };
  expect(answer.status).toBe(400);
  expect(error, "BUG: die Zeichenkette \"undefined\" steht in der Meldung").not.toMatch(/undefined/);
  expect(error).toMatch(/step/);
});
