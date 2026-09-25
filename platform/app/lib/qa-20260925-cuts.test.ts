/** QA 2026-09-25 ueber den echten Weg: Route -> Worker -> `web_cuts.py`. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";
import { GET as boardGet } from "@/app/api/board/[name]/[stem]/route";
import { tempDataRoot } from "@/lib/test-fixtures";

const board = (stem: string) =>
  boardGet(new Request(`http://x/api/board/phone/${stem}?size=128`), { params: Promise.resolve({ name: "phone", stem }) });

async function centre(res: Response): Promise<number[]> {
  expect(res.status, await res.clone().text()).toBe(200);
  const { data } = await sharp(Buffer.from(await res.arrayBuffer())).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const o = (64 * 128 + 64) * 3;
  return [data[o], data[o + 1], data[o + 2]];
}

test("a phone frame re-logged with other corners is cut under the NEW corners", async () => {
  const root = await tempDataRoot("qa-stored");
  const session = path.join(root, "recordings", "phone", "files", "sessions", "20260808-220912");
  await mkdir(path.join(session, "frames"), { recursive: true });
  // Links rot, rechts blau: die Ecken entscheiden, welche Haelfte das Brett ist.
  const px = Buffer.alloc(400 * 200 * 3);
  for (let i = 0; i < 400 * 200; i++) px.set((i % 400) < 200 ? [220, 20, 20] : [20, 20, 220], i * 3);
  await writeFile(path.join(session, "frames", "0000.png"), await sharp(px, { raw: { width: 400, height: 200, channels: 3 } }).png().toBuffer());
  const log = (corners: number[][]) =>
    writeFile(path.join(session, "log.jsonl"), `${JSON.stringify({ frame: "frames/0000.png", ply: 2, fen: "x", corners })}\n`);

  await log([[20, 20], [180, 20], [180, 180], [20, 180]]);
  const left = await centre(await board("0000"));
  expect(left[0]).toBeGreaterThan(150);

  await log([[220, 20], [380, 20], [380, 180], [220, 180]]);
  const right = await centre(await board("0000"));
  expect(right[2], `still the old quad: ${right}`).toBeGreaterThan(150);
});
