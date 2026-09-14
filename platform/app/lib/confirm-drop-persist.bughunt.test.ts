import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { writeConfirmation } from "@/lib/data";

/**
 * `drop` names plies a human struck because the LCS matched a SAN, not a position. It is never
 * stored: `writeConfirmation` recomputes the reviewed set from the LCS alone, so the next caller
 * that does not resend the list resurrects them — and `/api/zuege` never sends one.
 */
beforeEach(async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-drop-"));
  const dir = path.join(root, "recordings", "t");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "candidate.json"),
    JSON.stringify({
      moves: ["e4", "Nf6", "Nf3", "e5", "Nc3"].map((san, i) => ({ ply: i + 1, san, frame: 100 * (i + 1) })),
    }),
  );
  await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 2. Nf3 Nf6 3. Nc3 *");
  process.env.CHESSLAB_DATA_DIR = root;
});

test("a struck ply stays struck when the next confirm sends no drop list", async () => {
  expect(await writeConfirmation("t", [], [2])).not.toContain(2);
  const again = await writeConfirmation("t", []);
  expect(again, "BUG: /api/zuege confirms without `drop` and the struck ply is back").not.toContain(2);
});

test("the /api/zuege commit does not resurrect it either", async () => {
  await writeConfirmation("t", [], [2]);
  const { POST } = await import("@/app/api/zuege/[name]/route");
  const answer = await POST(
    new Request("http://local/api/zuege/t", { method: "POST", body: JSON.stringify({ action: "undo", kept: [] }) }),
    { params: Promise.resolve({ name: "t" }) },
  );
  expect(((await answer.json()) as { reviewed_plies: number[] }).reviewed_plies).not.toContain(2);
});
