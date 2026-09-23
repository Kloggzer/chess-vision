import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { chainState } from "@/lib/chain/chain";
import { tallyLines } from "@/lib/corpus/corpus";
import { flagFrame } from "@/lib/session-store/frame-flag";
import { DESKTOP_MODEL } from "@/lib/chain/cli-args";
import { verifyPack } from "@/lib/chain/pack";
import { jsonlRows, readJsonl, stripBom } from "@/lib/jsonl";
import { modelReadProvenance } from "@/lib/corpus/provenance";
import { dropReviewNotes, reviewNotesPath } from "@/lib/session-store/review-notes";
import { type RowSpec, tempDataRoot, writeSession } from "@/lib/test-fixtures";

test("eine halb geschriebene letzte Zeile ist keine Zeile", () => {
  const rows = jsonlRows('{"a":1}\n{"b":2}\n{"c":');
  expect(rows).toEqual([{ a: 1 }, { b: 2 }]);
});

test("eine kaputte Zeile MITTEN drin kann kein Schreiber erklaeren", () => {
  const got = readJsonl('{"a":1}\n{"kaputt\n{"b":2}');

  expect(got.rows).toEqual([{ a: 1 }, { b: 2 }]);
  expect([got.tail, got.corrupt]).toEqual([false, 1]);
});

// BOM (2026-09-21): fuenf Leser schnitten selbst und parsten Zeile 1 roh; `dropUnlocked` behielt
// die unparsbare Zeile, ein Urteil in der ersten Zeile liess sich nie widerrufen.
const BOM = "﻿";
const NAME = "2026-09-14-10-00-00";
let data: string;

const row = (frame: number): RowSpec => ({
  frame,
  fen: "8/8/8/8/8/8/8/R6R w - - 0 1",
  dirty: true,
  extra: { dirty_reason: "stale" },
});

beforeEach(async () => {
  data = await tempDataRoot("bom");
  delete process.env.CHESSLAB_MODEL_READ_RUN;
});

test("stripBom nimmt nur das fuehrende Zeichen, nie eines mitten im Inhalt", () => {
  expect(stripBom(`${BOM}{"a":1}`)).toBe('{"a":1}');
  expect(stripBom(`{"a":"x${BOM}y"}`)).toBe(`{"a":"x${BOM}y"}`);
  expect(stripBom(`${BOM}a${BOM}b`)).toBe(`a${BOM}b`);
});

test("tallyLines vertraegt ein BOM auf der ersten Manifest-Zeile", async () => {
  const tally = await tallyLines([
    `${BOM}${JSON.stringify({ session_id: "rg-a", label: "wP" })}`,
    JSON.stringify({ session_id: "rg-a", label: "empty" }),
  ]);
  expect(tally.rows).toBe(2);
});

test("flagFrame liest eine log.jsonl mit BOM", async () => {
  const dir = await writeSession({
    root: data, name: NAME, fps: 30,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [row(100), row(200)],
  });
  const file = path.join(dir, "log.jsonl");
  await writeFile(file, BOM + (await readFile(file, "utf8")), "utf8");

  await expect(flagFrame(NAME, "000200", true)).resolves.toMatchObject({ unusable: true });
  const after = (await readFile(file, "utf8")).split("\n");
  expect(JSON.parse(after[1])).toMatchObject({ unusable: true });
});

test("ein Urteil in der ERSTEN Zeile laesst sich widerrufen, auch mit BOM davor", async () => {
  const file = reviewNotesPath();
  await mkdir(path.dirname(file), { recursive: true });
  const note = { session_id: NAME, frame: "000100", verdict: "dirty-frame" as const };
  await writeFile(file, BOM + JSON.stringify({ ...note, ts: "2026-09-21T00:00:00+00:00" }) + "\n", "utf8");

  expect(await dropReviewNotes([note])).toBe(1);
  expect(await readFile(file, "utf8")).toBe("");
});

test("headerOf liest die Kopfzeile mit BOM, sonst gilt der Lauf als fehlend", async () => {
  await writeSession({
    root: data, name: NAME, fps: 30,
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
    rows: [row(100), row(200), row(300), row(400), row(500)],
  });
  const dir = path.join(data, "recordings", NAME);
  await writeFile(path.join(dir, "candidate.json"), JSON.stringify({ moves: [], confirmed: true }));
  await mkdir(path.join(data, "reports", "temporal-mattes", NAME), { recursive: true });
  await writeFile(path.join(data, "reports", "temporal-mattes", NAME, "pass.json"), JSON.stringify({ upserted: 3 }));
  await writeFile(path.join(dir, "model-reads.jsonl"), BOM + JSON.stringify({ _model: "runs/p4a-80-clahe" }) + "\n", "utf8");

  expect((await chainState(NAME)).hasModelReads).toBe(true);
});

test("parseFile findet das Modell in einer Kopfzeile mit BOM", async () => {
  const dir = path.join(data, "recordings", NAME);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "model-reads.jsonl"),
    BOM + JSON.stringify({ _model: "runs/p4a-80-clahe", _written_at: "2026-09-20" }) + "\n"
    + JSON.stringify({ cell: "a1", probs: [] }) + "\n", "utf8");

  expect(await modelReadProvenance()).toEqual([
    { name: NAME, rows: 1, probs: 1, model: "runs/p4a-80-clahe", writtenAt: "2026-09-20" },
  ]);
});

test("manifestRows vertraegt ein BOM auf der ersten Zeile", async () => {
  const out = path.join(data, "training-pack");
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "summary.json"), JSON.stringify({
    model: DESKTOP_MODEL,
    accepted_frames: 1, accepted_crops: 1,
    quarantine_frames: 0, quarantine_crops: 0,
    occluded_proposal_frames: 0, occluded_proposal_crops: 0,
  }));
  for (const [name, rows] of [["accepted", [{ frame: "00000001", label: "empty" }]], ["quarantine", []], ["occluded-proposals", []]] as const) {
    const sink = path.join(out, name);
    await mkdir(sink, { recursive: true });
    const body = rows.map((r) => JSON.stringify(r)).join("\n");
    await writeFile(path.join(sink, "manifest.jsonl"), body === "" ? "" : BOM + body + "\n", "utf8");
    await writeFile(path.join(sink, "packed_meta.json"), JSON.stringify({ n: rows.length, h: 80, w: 80 }));
    await writeFile(path.join(sink, "packed_images.u8"), Buffer.alloc(rows.length * 80 * 80 * 3));
  }

  await expect(verifyPack(out)).resolves.toMatchObject({ acceptedCrops: 1 });
});
