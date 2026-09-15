import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { appendCorrections } from "@/lib/corrections";
import { FILES, fenLabels } from "@/lib/fen";
import { loadLabelStream, type StreamCell } from "@/lib/label-stream";
import { laneCount, laneEmpty, openCells } from "@/lib/lanes";

const NAME = "2026-08-19-12-00-00";
const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SQUARES = [...FILES].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}`));
const key = (c: StreamCell) => `${c.stem}|${c.square}`;

/** [frames] quiet frames, nothing dirty — the whole settled population the control draws from. */
async function fixture(frames: number): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-stream-"));
  process.env.CHESSLAB_DATA_DIR = root;
  await mkdir(path.join(root, "recordings", NAME), { recursive: true });
  await mkdir(path.join(root, "recordings", NAME), { recursive: true });
  await writeFile(path.join(root, "recordings", NAME, "candidate.json"), '{"clock":{"fps":25},"moves":[]}', "utf8");
  const rows = Array.from({ length: frames }, (_, i) =>
    JSON.stringify({ frame: `${String(i).padStart(6, "0")}.png`, ply: 1, fen: FEN, corners: [] }),
  );
  await writeFile(path.join(root, "recordings", NAME, "log.jsonl"), rows.join("\n") + "\n", "utf8");
}

const control = async () => (await loadLabelStream()).cells;

test("the sample renews: judging every drawn cell draws a fresh set, never an empty lane", async () => {
  await fixture(400);
  const first = await control();
  expect(first).toHaveLength(180);
  // Was das Bug-Bild war: die alte Ziehung war blind und lieferte IMMER dieselben Zellen, also
  // stand die Lane nach der ersten Runde für immer leer.
  await appendCorrections(
    first.map((c) => ({ session_id: `rg-${NAME}`, frame: c.stem, square: c.square, label: c.fen_label })),
    "reviewed",
  );
  const second = await control();
  expect(second).toHaveLength(180);
  const seen = new Set(first.map(key));
  expect(second.filter((c) => seen.has(key(c)))).toEqual([]);
  const stream = await loadLabelStream();
  expect(openCells(stream, "control")).toHaveLength(180);
  expect(laneCount(stream, "control")).toEqual({ n: 180, total: 180 });
});

test("the draw spreads over the whole recording and over the 64 squares", async () => {
  await fixture(400);
  const cells = await control();
  const frames = cells.map((c) => Number(c.stem)).sort((a, b) => a - b);
  // Ein Los je gleich großer Scheibe der Aufnahme: nie zwei aus derselben Scheibe, nie ein Lauf
  // von Nachbarn — sonst misst die Stichprobe eine Minute statt der Partie.
  expect(new Set(frames).size).toBe(cells.length);
  expect(frames[0]).toBeLessThan(3);
  expect(frames[frames.length - 1]).toBeGreaterThan(395);
  expect(new Set(cells.map((c) => c.square)).size).toBeGreaterThan(40);
});

test("the draw is identical on a second load, so the list cannot resize under the cursor", async () => {
  await fixture(400);
  expect((await control()).map(key)).toEqual((await control()).map(key));
});

test("every settled cell judged: the lane is empty and says the sample is exhausted", async () => {
  await fixture(2);
  const labels = fenLabels(FEN);
  await appendCorrections(
    ["000000", "000001"].flatMap((frame) =>
      SQUARES.map((square) => ({
        session_id: `rg-${NAME}`,
        frame,
        square,
        label: labels[square] ?? "empty",
      })),
    ),
    "reviewed",
  );
  const stream = await loadLabelStream();
  expect(stream.cells).toEqual([]);
  expect(laneCount(stream, "control")).toEqual({ n: 0, total: 0 });
  // „leer" ist hier wahr, aber die falsche Auskunft: nichts wartet, WEIL nichts mehr übrig ist.
  expect(laneEmpty("control")).toContain("erschöpft");
  expect(laneEmpty("all")).toContain("nichts wartet");
});

test("a reported dirty frame survives the reload — the note is on disk, so the mark must be", async () => {
  await fixture(20);
  const { appendReviewNotes } = await import("@/lib/review-notes");
  await appendReviewNotes([
    { session_id: `rg-${NAME}`, frame: "000003", verdict: "dirty-frame" },
    { session_id: `rg-${NAME}`, frame: "000007", verdict: "dirty-frame" },
    { session_id: `rg-${NAME}`, frame: "000009", verdict: "matte-ok" },
  ]);
  const { sessions } = await loadLabelStream();
  // `matte-ok` is not a hand: it answers the alpha, and the frame keeps no mark from it.
  expect(sessions[0].reportedDirty.sort()).toEqual(["000003", "000007"]);
});
