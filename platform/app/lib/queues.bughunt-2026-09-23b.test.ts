/**
 * `bareFrames` dekodierte JEDEN Bildkopf, nur um Frames zu ZAEHLEN: ein kaputter Frame nahm damit
 * `queueRows` und die Startseite mit. Zaehlen braucht keinen Kopf; wer die GROESSE will, wirft.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

async function bundle(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "recordings", "g", "frames");
  await mkdir(dir, { recursive: true });
  const board = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).webp().toBuffer();
  await writeFile(path.join(dir, "000001.webp"), board);
  await writeFile(path.join(dir, "000002.webp"), Buffer.from("kein bild"));
  return path.join(dir, "000002.webp");
}

test("ein kaputter Frame-Kopf nimmt die Startseite nicht mit — gezaehlt wird die Datei", async () => {
  await bundle("countjunk");
  const { queueRows } = await import("@/lib/queues");
  const rows = await queueRows();
  expect(rows.map((r) => [r.name, r.frames])).toEqual([["g", 2]]);
});

test("wer die GROESSE will, bekommt den kaputten Frame beim Namen genannt", async () => {
  const broken = await bundle("sizejunkname");
  const { listFrameStems } = await import("@/lib/data");
  await expect(listFrameStems("g")).rejects.toThrow(broken);
});
