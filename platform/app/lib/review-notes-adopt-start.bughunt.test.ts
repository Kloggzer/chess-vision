import { mkdir } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * `adoptDirty` wurde ohne `await` gefeuert und die Route antwortete 200 — scheiterte schon der
 * START, sah das niemand. Hausregel: Hintergrundarbeit meldet ihr Scheitern.
 */
let dir: string;

beforeEach(async () => {
  dir = await tempDataRoot("adopt-start");
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
});

const post = async () => {
  const { POST } = await import("@/app/api/review-notes/route");
  return POST(new Request("http://local/api/review-notes", {
    method: "POST",
    body: JSON.stringify({ rows: [{ session_id: "rg-g", frame: "000002", verdict: "dirty-frame" }] }),
  }));
};

test("a launch that never happened is in the answer", async () => {
  process.env.CHESSLAB_UV = path.join(dir, "gibt-es-nicht.exe");
  const body = (await post()).json() as Promise<{ written: number; adoptFailed?: string[] }>;
  const { written, adoptFailed } = await body;
  expect(written).toBe(1);
  expect(adoptFailed, "BUG: 200 beweist nur den Zettel, nicht den Start").toEqual([expect.stringContaining("g")]);
});

test("a launch that worked says nothing extra", async () => {
  process.env.CHESSLAB_UV = process.execPath;
  const answer = (await (await post()).json()) as { written: number; adoptFailed?: string[] };
  expect(answer).toEqual({ written: 1, adoptFailed: [] });
});
