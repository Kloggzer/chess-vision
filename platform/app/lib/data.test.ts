import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, test } from "vitest";
import { writeConfirmation } from "@/lib/data";
import { lcsReport } from "@/lib/lcs";
import { tempDataRoot } from "@/lib/test-fixtures";

/** Same fixture as `tests/test_realgames.py::_candidate`. */
const PGN = '[Event "t"]\n\n1. e4 e5 2. Nf3 Nc6 *\n';
/** Written as TEXT, not as an object: `0.0` is exactly the byte the writer must not round off. */
const CANDIDATE = JSON.stringify(
  {
    name: "g",
    confirmed: false,
    geometry: { board_size: 928, margin: "@0.0@" },
    moves: ["e4", "d4", "Nf3", "Nc6"].map((san, i) => ({
      ply: i + 1,
      san,
      frame: 100 * (i + 1),
      decider: "cnn_occupancy",
    })),
  },
  null,
  2,
).replace('"@0.0@"', "0.0");

let file: string;

beforeEach(async () => {
  const root = await tempDataRoot("app");
  const dir = path.join(root, "recordings", "g");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "reference.pgn"), PGN, "utf8");
  file = path.join(dir, "candidate.json");
  await writeFile(file, CANDIDATE + "\n", "utf8");
});

test("lcs mirrors the python/kotlin semantics", () => {
  const { matched, invented, missed } = lcsReport(["a", "b", "c", "d"], ["a", "x", "c"]);
  expect(matched.length).toBe(2);
  expect(invented).toEqual([1]);
  expect(missed).toEqual([1, 3]);
});

test("the confirm POST writes only the three keys", async () => {
  const before = JSON.parse(await readFile(file, "utf8"));
  const { POST } = await import("@/app/api/confirm/[name]/route");

  const response = await POST(
    new Request("http://localhost/api/confirm/g", {
      method: "POST",
      body: JSON.stringify({ kept: [] }),
    }),
    { params: Promise.resolve({ name: "g" }) },
  );
  expect(response.status).toBe(200);

  const text = await readFile(file, "utf8");
  const after = JSON.parse(text);
  // The key-set diff of tests/test_realgames.py::test_confirm_writes_only_the_three_keys.
  const added = Object.keys(after).filter((k) => !(k in before));
  expect(new Set(added)).toEqual(new Set(["confirmed_at", "reviewed_plies"]));
  expect(before.confirmed).toBe(false);
  expect(after.confirmed).toBe(true);
  expect(after.confirmed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  for (const key of Object.keys(before).filter((k) => k !== "confirmed")) {
    expect(after[key], key).toEqual(before[key]);
  }
  expect(after.reviewed_plies).toEqual([1, 3, 4]); // "d4" is invented and was not kept
  expect(text.endsWith("\n")).toBe(true);
  expect(text).toContain('"margin": 0.0'); // untouched keys keep their bytes, not just their value
});

describe("a matched ply the human strikes", () => {
  it("leaves the reviewed set — a transposition matches SANs, not positions", async () => {
    // The replay's order against the reference's: its `Nf6` matches the reference's own `Nf6`, two
    // plies later, so the LCS calls it reviewed while its commit window still showed `e5` on the
    // board. The position that ply stamps never existed, so a human must be able to strike it.
    const dir = path.join(process.env.CHESSLAB_DATA_DIR!, "recordings", "t");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "candidate.json"),
      JSON.stringify({
        moves: ["e4", "Nf6", "Nf3", "e5", "Nc3"].map((san, i) => ({ ply: i + 1, san, frame: 100 * (i + 1) })),
      }),
    );
    await writeFile(path.join(dir, "reference.pgn"), "1. e4 e5 2. Nf3 Nf6 3. Nc3 *");

    expect(await writeConfirmation("t", [], [])).toContain(2);
    expect(await writeConfirmation("t", [], [2])).not.toContain(2);
  });
});
