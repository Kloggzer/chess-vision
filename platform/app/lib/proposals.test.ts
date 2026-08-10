import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { acceptLabel, DISAGREE, loadProposals, matches, splitStreams } from "@/lib/proposals";

/** The pinned schema of specs/53-cnn-headroom/entry.md, header line included. */
const LINES = [
  '{"_thresholds": {"hi": 0.8, "lo": 0.2}}',
  '{"session_id": "rg-g", "frame": "000100", "square": "e2", "fen_label": "wQ", "proposed": "occluded", "score": 0.91}',
  '{"session_id": "rg-g", "frame": "000100", "square": "e3", "fen_label": "empty", "proposed": "occluded", "score": 0.55}',
  '{"session_id": "rg-g", "frame": "000200", "square": "a1", "fen_label": "wR", "proposed": "wR", "score": 0.04}',
];

async function withFile(lines: string[]) {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-proposals-"));
  await mkdir(path.join(root, "realgames", "g"), { recursive: true });
  await writeFile(
    path.join(root, "realgames", "g", "occluded-proposals.jsonl"),
    lines.join("\n") + "\n",
    "utf8",
  );
  process.env.CHESSLAB_DATA_DIR = root;
  return loadProposals("g");
}

test("header, rows and the three streams", async () => {
  const { rows, thresholds, source } = await withFile(LINES);
  expect(source).toBe("pack");
  expect(thresholds).toEqual({ hi: 0.8, lo: 0.2, declared: true });
  expect(rows.map((r) => r.score)).toEqual([0.91, 0.55, 0.04]); // score descending

  const { confirm, unsure, control } = splitStreams(rows, thresholds);
  expect(confirm.map((r) => r.square)).toEqual(["e2"]);
  expect(unsure.map((r) => r.square)).toEqual(["e3"]);
  expect(control.map((r) => r.square)).toEqual(["a1"]);
});

test("a file without a header falls back to defaults and SAYS so", async () => {
  const { thresholds } = await withFile(LINES.slice(1));
  expect(thresholds).toEqual({ hi: 0.7, lo: 0.3, declared: false });
});

test("no artifact and no fixture is empty, not an error", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-proposals-"));
  await mkdir(path.join(root, "realgames", "g"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
  expect(await loadProposals("g")).toMatchObject({ rows: [], source: "none" });
});

test("the hand-written fixture parses exactly like the real artifact", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-proposals-"));
  await mkdir(path.join(root, "realgames", "rec-20260808-003957"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
  const { rows, thresholds, source } = await loadProposals("rec-20260808-003957");
  expect(source).toBe("fixture");
  expect(thresholds).toEqual({ hi: 0.7, lo: 0.3, declared: true });
  expect(rows.length).toBeGreaterThan(60);
  for (const row of rows) {
    expect(Object.keys(row).sort()).toEqual([
      "fen_label",
      "frame",
      "proposed",
      "score",
      "session_id",
      "square",
    ]);
  }
  const streams = splitStreams(rows, thresholds);
  expect(streams.confirm.length).toBeGreaterThan(60); // a full page plus exceptions
  expect(streams.unsure.length).toBeGreaterThan(0);
  expect(streams.control.length).toBeGreaterThan(0);
});

test("the occluded question is answered by score when no model ran", () => {
  // The 2026-08-10 bug: `matches` required `probs`, so a session proposed without --model
  // answered "nothing" to every occluded query and the filter could not be run at all.
  const row = { frame: "1", square: "g3", fen_label: "empty", proposed: "keep", score: 0.55,
                session_id: "s", grid_score: 0.5 };
  expect(matches(row, { klass: "occluded", min: 0.5 })).toBe(true);
  expect(matches(row, { klass: "occluded", min: 0.7 })).toBe(false);
  expect(matches(row, { klass: "wP", min: 0.5 })).toBe(false); // identity still needs a model
});

test("confirming a threshold query writes its class, not the model's argmax", () => {
  // The cell reads wP most strongly but carries enough occluded mass to match the query. The
  // human answered the question that was ASKED — "is this occluded" — so `occluded` is written.
  const row = { frame: "1", square: "e4", fen_label: "empty", proposed: "occluded", score: 0.6,
                session_id: "s", probs: { wP: 0.55, occluded: 0.4 } };
  expect(acceptLabel(row, { klass: "occluded", min: 0.3 })).toBe("occluded");
});

test("confirming a disagree query writes the model's own reading", () => {
  const row = { frame: "1", square: "e4", fen_label: "empty", proposed: "keep", score: 0.2,
                session_id: "s", probs: { wP: 0.8, empty: 0.1 } };
  expect(acceptLabel(row, { klass: DISAGREE, min: 0.3 })).toBe("wP");
});

test("a cell the model never read cannot be confirmed by a disagree query", () => {
  const row = { frame: "1", square: "e4", fen_label: "empty", proposed: "keep", score: 0.2, session_id: "s" };
  expect(acceptLabel(row, { klass: DISAGREE, min: 0.3 })).toBeNull();
});
