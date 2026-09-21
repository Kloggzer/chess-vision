/**
 * Audit 2026-09-21: was die Routen im FEHLERFALL tun. Jede Route hatte einen Test, aber keiner
 * fragte nach dem leeren Rumpf, dem kaputten Bild oder der Aufnahme, die es nicht gibt.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { stemOf, tempDataRoot, writeSession } from "@/lib/test-fixtures";

let root: string;

beforeEach(async () => {
  root = await tempDataRoot("adversarial");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
});

const verdict = async (body: unknown) => {
  const { POST } = await import("@/app/api/frame-verdict/route");
  return POST(new Request("http://local/api/frame-verdict", { method: "POST", body: JSON.stringify(body) }));
};

const ledger = () => readFile(path.join(root, "labels", "review-notes.jsonl"), "utf8").catch(() => "");

test("frame-verdict ohne session_id schreibt kein Urteil ueber die Sitzung \"undefined\"", async () => {
  const res = await verdict({ verdict: "matte" });

  expect(res.status, "BUG: `String(undefined)` kam durch `checkName` und wurde zur Sitzung").toBe(400);
  expect(await ledger()).toBe("");
});

test("frame-verdict ohne frame schreibt kein Urteil ueber Frame \"undefined\"", async () => {
  const res = await verdict({ session_id: "rg-g", verdict: "matte" });

  expect(res.status).toBe(400);
  expect(await ledger()).toBe("");
});

test("frame-verdict: der gueltige Weg schreibt weiterhin", async () => {
  const res = await verdict({ session_id: "rg-g", frame: "000002", verdict: "matte" });

  expect(await res.json()).toEqual({ written: 1 });
});

test("board: ein unlesbares exportiertes Brett ist 500, eine Aufnahme ohne Export 404", async () => {
  const dir = await writeSession({
    root, name: "kaputt", moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  });
  await mkdir(path.join(dir, "boards"), { recursive: true });
  await writeFile(path.join(dir, "boards", `${stemOf(100)}.webp`), "kein bild", "utf8");
  const { GET } = await import("@/app/api/board/[name]/[stem]/route");
  const get = (stem: string) =>
    GET(new Request(`http://local/api/board/kaputt/${stem}`), {
      params: Promise.resolve({ name: "kaputt", stem }),
    });

  expect((await get("000100")).status, "BUG: jeder Fehler war 404, auch ein kaputtes Brett").toBe(500);

  const nix = await GET(new Request("http://local/api/board/g/000100"), {
    params: Promise.resolve({ name: "g", stem: "000100" }),
  });
  expect(nix.status, "nie exportiert und kein Handy-JPEG: das ist \"nicht da\"").toBe(404);
});

/** Das Alpha, das SAM geschnitten hat: quadratisch, gleichmaessig, in der Groesse des Bretts. */
async function samAlpha(dir: string, stem: string, side: number, fill: number): Promise<void> {
  await mkdir(path.join(dir, "mattes"), { recursive: true });
  const webp = await sharp(Buffer.alloc(side * side, fill), { raw: { width: side, height: side, channels: 1 } })
    .webp({ lossless: true })
    .toBuffer();
  await writeFile(path.join(dir, "mattes", `${stem}.webp`), webp);
}

/** Der Strichbelag des Stifts, RGBA: rot hebt das Alpha, cyan senkt es. */
async function strokes(side: number, kind: "up" | "down", box?: [number, number]): Promise<string> {
  const data = Buffer.alloc(side * side * 4);
  const [x0, x1] = box ?? [0, side];
  for (let y = x0; y < x1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = (y * side + x) * 4;
      if (kind === "up") data[o] = 255;
      else { data[o + 1] = 255; data[o + 2] = 255; }
      data[o + 3] = 255;
    }
  }
  const png = await sharp(data, { raw: { width: side, height: side, channels: 4 } }).png().toBuffer();
  return png.toString("base64");
}

test("matte: ein zweiter Strich baut auf der HANDFASSUNG auf, nicht wieder auf SAMs Alpha", async () => {
  const side = 32;
  const dir = await writeSession({
    root, name: "malen", boardSize: side,
    rows: [{ frame: 100, boardSize: side }],
    moves: [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }],
  });
  await samAlpha(dir, stemOf(100), side, 200);
  const { POST } = await import("@/app/api/matte/[name]/[stem]/route");
  const paint = async (mask: string) =>
    POST(new Request("http://local/api/matte/malen/000100", { method: "POST", body: JSON.stringify({ mask }) }),
      { params: Promise.resolve({ name: "malen", stem: "000100" }) });

  // Erst radiert der Mensch SAMs Fund ganz weg, dann setzt er EINEN Strich in die Ecke.
  expect((await paint(await strokes(side, "down"))).status).toBe(200);
  expect((await paint(await strokes(side, "up", [0, 4]))).status).toBe(200);

  const fixed = await sharp(await readFile(path.join(dir, "mattes", `${stemOf(100)}.fixed.webp`)))
    .greyscale().raw().toBuffer();
  expect(fixed[side * side - 1], "BUG: die Radierung war weg, SAMs Alpha stand wieder da").toBe(0);
  expect(fixed[0], "der neue Strich steht").toBe(255);
});
