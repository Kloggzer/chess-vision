/**
 * "A zero exit code is not enough": die vier Formpruefungen eines Packs, die bisher keine Probe
 * hatte. Ein halb geschriebener Pack hat die richtigen Etiketten und trotzdem zu wenig Bytes —
 * ohne sie meldet `runPack` `done` auf Trainingsmaterial, das es nicht gibt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { DESKTOP_MODEL, verifyPack } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

const SIDE = 80;
let out: string;

type Row = Record<string, unknown>;

async function sink(name: string, rows: Row[], meta: Row, bytes: number): Promise<void> {
  const dir = path.join(out, name);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "manifest.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  await writeFile(path.join(dir, "packed_meta.json"), JSON.stringify(meta));
  await writeFile(path.join(dir, "packed_images.u8"), Buffer.alloc(bytes));
}

/** Ein heiler Pack mit EINEM Crop je Senke; jeder Test verbiegt danach genau eine Zahl. */
async function pack(): Promise<void> {
  await mkdir(out, { recursive: true });
  await writeFile(path.join(out, "summary.json"), JSON.stringify({
    model: DESKTOP_MODEL,
    accepted_frames: 1, accepted_crops: 1,
    quarantine_frames: 1, quarantine_crops: 1,
    occluded_proposal_frames: 1, occluded_proposal_crops: 1,
  }));
  const meta = { n: 1, h: SIDE, w: SIDE };
  const bytes = SIDE * SIDE * 3;
  await sink("accepted", [{ frame: "000001", label: "empty" }], meta, bytes);
  const held = { label: "unreviewed", review_status: "quarantine" };
  await sink("quarantine", [{ frame: "000002", proposed_label: "wP", ...held }], meta, bytes);
  await sink("occluded-proposals", [{ frame: "000003", proposed_label: "occluded", ...held }], meta, bytes);
}

beforeEach(async () => {
  out = path.join(await tempDataRoot("pack-verify"), "training-pack");
  await pack();
});

test("heil laeuft durch — sonst misst der Rest nichts", async () => {
  await expect(verifyPack(out)).resolves.toMatchObject({ acceptedCrops: 1 });
});

test("zu wenige Zeilen im Manifest", async () => {
  await sink("accepted", [], { n: 1, h: SIDE, w: SIDE }, SIDE * SIDE * 3);
  await expect(verifyPack(out)).rejects.toThrow("has 0 rows, expected 1");
});

test("ein Frame weniger als die Zusammenfassung behauptet", async () => {
  const two = [{ frame: "000002", proposed_label: "wP", label: "unreviewed", review_status: "quarantine" }];
  await sink("quarantine", [...two, ...two], { n: 2, h: SIDE, w: SIDE }, 2 * SIDE * SIDE * 3);
  await writeFile(path.join(out, "summary.json"), JSON.stringify({
    model: DESKTOP_MODEL,
    accepted_frames: 1, accepted_crops: 1,
    quarantine_frames: 2, quarantine_crops: 2,
    occluded_proposal_frames: 1, occluded_proposal_crops: 1,
  }));
  await expect(verifyPack(out)).rejects.toThrow("has 1 frames, expected 2");
});

test("ein anderes Crop-Mass als das, mit dem trainiert wird", async () => {
  await sink("accepted", [{ frame: "000001", label: "empty" }], { n: 1, h: 128, w: 128 }, 128 * 128 * 3);
  await expect(verifyPack(out)).rejects.toThrow(`expected ${SIDE}x${SIDE}`);
});

test("ein abgerissener Memmap — richtige Etiketten, zu wenig Bytes", async () => {
  await sink("accepted", [{ frame: "000001", label: "empty" }], { n: 1, h: SIDE, w: SIDE }, SIDE * SIDE * 3 - 1);
  await expect(verifyPack(out)).rejects.toThrow("unsafe size");
});
