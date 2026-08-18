import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { boardProgress, boardProgressOf, loadProposalSummary, summaryFromRows } from "@/lib/proposal-summaries";
import type { Proposal } from "@/lib/proposals";

const LINES = [
  '{"_thresholds": {"hi": 0.7, "lo": 0.3}}',
  '{"session_id": "rg-g", "frame": "000100", "square": "e2", "fen_label": "wQ", "proposed": "occluded", "score": 0.91}',
  '{"session_id": "rg-g", "frame": "000100", "square": "e3", "fen_label": "empty", "proposed": "occluded", "score": 0.55}',
  '{"session_id": "rg-g", "frame": "000200", "square": "a1", "fen_label": "wR", "proposed": "wR", "score": 0.04}',
];

const SIDECAR = {
  boards: 3,
  cells: 30364,
  frames: ["000900", "000901", "000902"],
  hi: 0.7,
  lo: 0.3,
  model: "data/models/real14-ms-s3-hn-bn80",
  written_at: "2026-08-15T09:00:00+00:00",
};

async function game(lines: string[], sidecar?: unknown, name = "g") {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-summary-"));
  const dir = path.join(root, "realgames", name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "occluded-proposals.jsonl"), lines.join("\n") + "\n", "utf8");
  if (sidecar !== undefined) {
    await writeFile(path.join(dir, "occluded-proposals.summary.json"), JSON.stringify(sidecar), "utf8");
  }
  process.env.CHESSLAB_DATA_DIR = root;
  return dir;
}

test("the sidecar is read verbatim, and its dead stream counts are not carried along", async () => {
  // `by_stream` zählte die drei Occlusion-Bänder; die Frage stellt niemand mehr (matte.jsonl).
  await game(LINES, { ...SIDECAR, by_stream: { confirm: 1225, unsure: 5230, control: 180 } });
  const summary = await loadProposalSummary("g");
  expect(summary).toEqual({ ...SIDECAR, read: "sidecar" });
});

test("without a sidecar the same shape is counted off the rows, and the surface is told", async () => {
  await game(LINES);
  const summary = await loadProposalSummary("g");
  expect(summary).toEqual({
    boards: 2,
    cells: 3,
    frames: ["000100", "000200"],
    hi: 0.7,
    lo: 0.3,
    model: null,
    written_at: null,
    read: "fallback",
  });
});

test("no proposals at all is `none`, so a surface can print — instead of 0", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "chesslab-summary-"));
  await mkdir(path.join(root, "realgames", "g"), { recursive: true });
  process.env.CHESSLAB_DATA_DIR = root;
  expect(await loadProposalSummary("g")).toMatchObject({ read: "none", boards: 0 });
});

test("a sidecar without its two counts is not a sidecar — the rows answer instead", async () => {
  await game(LINES, { hi: 0.7, lo: 0.3 });
  expect(await loadProposalSummary("g")).toMatchObject({ read: "fallback", boards: 2 });
});

test("the cache is mtime-keyed: an unchanged file is not re-read, a rewritten one is", async () => {
  const dir = await game(LINES);
  const first = await loadProposalSummary("g");
  expect(await loadProposalSummary("g")).toBe(first); // same object — nothing was parsed again

  await writeFile(
    path.join(dir, "occluded-proposals.jsonl"),
    LINES.concat(
      '{"session_id": "rg-g", "frame": "000300", "square": "b2", "fen_label": "empty", "proposed": "occluded", "score": 0.95}',
    ).join("\n") + "\n",
    "utf8",
  );
  const second = await loadProposalSummary("g");
  expect(second.boards).toBe(3);
  expect(second.cells).toBe(4);
});

test("a sidecar appearing later wins over the count", async () => {
  const dir = await game(LINES);
  expect(await loadProposalSummary("g")).toMatchObject({ read: "fallback" });
  await writeFile(path.join(dir, "occluded-proposals.summary.json"), JSON.stringify(SIDECAR), "utf8");
  expect(await loadProposalSummary("g")).toMatchObject({ read: "sidecar", boards: 3 });
});

test("with a sidecar the progress figure never touches the rows", async () => {
  await game(["}{ not json", "also not json"], SIDECAR);
  const { boards, done } = await boardProgressOf("g", ["000900|e2", "000901|a1", "004242|h8"]);
  expect({ boards, done }).toEqual({ boards: 3, done: 2 });
});

test("a sidecar from before `frames` existed still pays the parse, and says the rows' truth", async () => {
  const old = { ...SIDECAR, frames: undefined };
  await game(LINES, old);
  const { boards, done } = await boardProgressOf("g", ["000100|e2"]);
  expect({ boards, done }).toEqual({ boards: 2, done: 1 });
});

const rows = (...specs: [string, string, number][]): Proposal[] =>
  specs.map(([frame, square, score]) => ({
    session_id: "rg-g",
    frame,
    square,
    fen_label: "empty",
    proposed: "occluded",
    score,
  }));

test("summaryFromRows counts BOARDS as distinct frames, not rows", () => {
  const summary = summaryFromRows(rows(["000100", "a1", 0.9], ["000100", "a2", 0.9], ["000200", "a1", 0.1]), {
    hi: 0.7,
    lo: 0.3,
    declared: true,
  });
  expect(summary.boards).toBe(2);
  expect(summary.cells).toBe(3);
});

test("the board denominator is |touched ∩ proposed| / |proposed|", () => {
  const proposed = ["000100", "000200", "000300", "000400"];
  const judged = [
    "000100|a1", // one board, three cells — still ONE board
    "000100|a2",
    "000100|b1",
    "000300|h8",
    "009999|a1", // a frame with no proposal row: work on another corpus, not on this one
  ];
  expect(boardProgress(proposed, judged)).toEqual({ boards: 4, done: 2 });
});

test("the cell count and the board count disagree, which is the whole point of D1", () => {
  // 12 flags on one board are one board of work and twelve cells of it. A bar that mixes the two
  // is the 8.3 % that should have read 57.9 %.
  const judged = Array.from({ length: 12 }, (_, i) => `000100|a${(i % 8) + 1}`);
  expect(boardProgress(["000100", "000200"], judged)).toEqual({ boards: 2, done: 1 });
});
