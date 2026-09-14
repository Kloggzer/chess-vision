import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { loadLabelStream } from "@/lib/label-stream";
import { openBoards } from "@/lib/lanes";

/**
 * Eine Matte, die UEBERALL 0 misst, ist das Ergebnis von `clearAlpha` + `occluders recut`
 * ("da ist gar nichts"). Python nimmt sie: `read_matte` behaelt die Zeile, `settle and cover`
 * greift, und die 64 Zellen des Frames landen im Pool. Der Strom wirft die Nullen weg und
 * `reachesPool` liest das leere Objekt als "keine Matte".
 */
const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SQUARES = [..."abcdefgh"].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}`));

async function fixture(coverage: Record<string, number>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-zero-"));
  process.env.CHESSLAB_DATA_DIR = root;
  const name = "2026-09-14-10-00-00";
  const dir = path.join(root, "recordings", name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "candidate.json"), '{"moves":[]}', "utf8");
  await writeFile(
    path.join(dir, "log.jsonl"),
    JSON.stringify({
      frame: "000000.png", ply: 1, fen: FEN, corners: [],
      dirty: true, dirty_reason: "stale", settle_dev: [1.0, 2.0],
    }) + "\n",
    "utf8",
  );
  await writeFile(
    path.join(dir, "matte.jsonl"),
    JSON.stringify({ frame: "000000", coverage, concepts: {} }) + "\n",
    "utf8",
  );
  return name;
}

const allZero = Object.fromEntries(SQUARES.map((sq) => [sq, 0]));

test("Kontrolle: eine Matte mit einer gemessenen Verdeckung rettet das `stale` Brett", async () => {
  await fixture({ ...allZero, h6: 0.9 });
  const stream = await loadLabelStream();
  expect(openBoards(stream, "all")).toHaveLength(1);
});

test("eine geleerte Matte ist eine MESSUNG, keine fehlende — das Brett bleibt labelbar", async () => {
  await fixture(allZero);
  const stream = await loadLabelStream();
  // Python schneidet dieses Frame; die Lane zeigt es nicht, also ist es nur hier nicht zu labeln.
  expect(openBoards(stream, "all")).toHaveLength(1);
});
