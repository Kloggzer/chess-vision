/** `/api/cell`, `/api/board`, `/api/matte` ueber den echten Weg: Route -> Worker -> `web_cuts.py`.
 *  Pixelgleichheit mit `labeling.crop_square` prueft `tests/test_web_cuts.py`; hier Geometrie und Status. */
import { mkdir, readFile, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, expect, test } from "vitest";
import { GET as boardGet } from "@/app/api/board/[name]/[stem]/route";
import { GET as cellGet } from "@/app/api/cell/[name]/[stem]/[square]/route";
import { GET as matteGet, POST as mattePost } from "@/app/api/matte/[name]/[stem]/route";
import { type RowSpec, stemOf, tempDataRoot, writeLog, writeSession } from "@/lib/test-fixtures";

const SIZE = 928;
const CELL = SIZE / 8;
const BORDER = 12;
const MOVES = [{ ply: 1, san: "e4", frame: 100, fen_after: "x" }];

let root: string;
let dir: string;

beforeEach(async () => {
  root = await tempDataRoot("cuts");
  dir = await writeSession({ root, moves: MOVES });
});

type Rgb = [number, number, number];
/** Jedes Feld eine eigene Farbe: Spalte in Rot, Reihe (a8 oben) in Gruen. */
const colourOf = (col: number, row: number): Rgb => [20 + col * 30, 20 + row * 30, 128];

async function gridBoard(border: number, flat?: number): Promise<Buffer> {
  const side = SIZE + 2 * border;
  const data = Buffer.alloc(side * side * 3);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const col = Math.min(7, Math.max(0, Math.floor((x - border) / CELL)));
      const row = Math.min(7, Math.max(0, Math.floor((y - border) / CELL)));
      const px = flat === undefined ? colourOf(col, row) : [flat, flat, flat];
      data.set(px, (y * side + x) * 3);
    }
  }
  return sharp(data, { raw: { width: side, height: side, channels: 3 } }).webp({ lossless: true }).toBuffer();
}

async function put(sub: string, file: string, bytes: Buffer, when?: number): Promise<void> {
  await mkdir(path.join(dir, sub), { recursive: true });
  const at = path.join(dir, sub, file);
  await writeFile(at, bytes);
  if (when !== undefined) await utimes(at, new Date(when), new Date(when));
}

const row = (spec: Partial<RowSpec> = {}): RowSpec => ({ frame: 110, fen: "x", boardBorder: BORDER, ...spec });

const cell = (square: string, size: number, stem = "000110", name = "g", median = false) =>
  cellGet(new Request(`http://x/api/cell/${name}/${stem}/${square}?size=${size}${median ? "&median=1" : ""}`), {
    params: Promise.resolve({ name, stem, square }),
  });
const board = (size: number, stem = "000110", name = "g") =>
  boardGet(new Request(`http://x/api/board/${name}/${stem}?size=${size}`), { params: Promise.resolve({ name, stem }) });
const matte = (size: number, stem = "000110") =>
  matteGet(new Request(`http://x/api/matte/g/${stem}?size=${size}`), { params: Promise.resolve({ name: "g", stem }) });

async function pixels(res: Response) {
  expect(res.status, await res.clone().text()).toBe(200);
  expect(res.headers.get("content-type")).toBe("image/jpeg");
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number): Rgb => {
    const o = (y * info.width + x) * 3;
    return [data[o], data[o + 1], data[o + 2]];
  };
  return { width: info.width, height: info.height, at, mean: data.reduce((n, v) => n + v, 0) / data.length };
}

const near = (got: Rgb, want: Rgb, what: string) =>
  got.forEach((v, i) => expect(Math.abs(v - want[i]), `${what}: ${got} != ${want}`).toBeLessThanOrEqual(12));

test("a cell is its own square in the middle and its neighbour's in the pad", async () => {
  await writeLog(dir, [row()]);
  await put("boards", "000110.webp", await gridBoard(BORDER));
  const px = await pixels(await cell("e4", 64));
  expect([px.width, px.height]).toEqual([64, 64]);
  near(px.at(32, 32), colourOf(4, 4), "e4 centre");
  // pad_side 0.05: gut 2 px des 64er Crops gehoeren d4 links und e5 oben.
  near(px.at(0, 32), colourOf(3, 4), "d4 in the left pad");
  near(px.at(32, 0), colourOf(4, 3), "e5 in the top pad");
});

test("a row's own border is honoured, whatever the profile's border would be", async () => {
  await writeLog(dir, [row({ boardBorder: 40 })]);
  await put("boards", "000110.webp", await gridBoard(40));
  const px = await pixels(await cell("a8", 64));
  near(px.at(32, 32), colourOf(0, 0), "a8 centre");
  near(px.at(63, 32), colourOf(1, 0), "b8 in the right pad");
});

test("the board is the playing field, a8 top left, h1 bottom right", async () => {
  await writeLog(dir, [row()]);
  await put("boards", "000110.webp", await gridBoard(BORDER));
  const px = await pixels(await board(128));
  expect([px.width, px.height]).toEqual([128, 128]);
  near(px.at(8, 8), colourOf(0, 0), "a8");
  near(px.at(120, 120), colourOf(7, 7), "h1");
  near(px.at(0, 0), colourOf(0, 0), "no border in the field");
});

test("the median samples the whole ply interval, not only its front", async () => {
  const frames = 14;
  await writeLog(dir, Array.from({ length: frames }, (_, i) => row({ frame: 100 + i })));
  for (let i = 0; i < frames; i++) await put("boards", `${stemOf(100 + i)}.webp`, await gridBoard(BORDER, i >= 7 ? 250 : 10));
  const px = await pixels(await cell("e4", 8, "000100", "g", true));
  expect(px.mean, "BUG: stride 2 over 14 frames — indices 9..13 are never sampled").toBeGreaterThan(128);
});

test("a rewritten board is cut from its new pixels", async () => {
  await writeLog(dir, [row()]);
  await put("boards", "000110.webp", await gridBoard(BORDER, 10), Date.UTC(2026, 0, 1));
  expect((await pixels(await cell("e4", 8))).mean).toBeLessThan(64);
  await put("boards", "000110.webp", await gridBoard(BORDER, 250), Date.UTC(2026, 0, 2));
  expect((await pixels(await cell("e4", 8))).mean, "BUG: the cache served the old pixels").toBeGreaterThan(192);
});

test("a new pad_side in candidate.json changes the cut", async () => {
  await writeLog(dir, [row()]);
  await put("boards", "000110.webp", await gridBoard(BORDER));
  near((await pixels(await cell("e4", 64))).at(0, 32), colourOf(3, 4), "pad 0.05");
  const file = path.join(dir, "candidate.json");
  const candidate = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
  candidate.source = { crop: { pad_side: 0.45 } };
  await writeFile(file, JSON.stringify(candidate), "utf8");
  near((await pixels(await cell("e4", 64))).at(10, 32), colourOf(3, 4), "pad 0.45 reaches deep into d4");
});

test.each([
  ["a row with no board", row({ board: false }), false, /000110: row carries no board/],
  ["a board the export never wrote", row(), false, /board boards\/000110\.webp is missing/],
  ["a board never straightened", row({ straightened: false }), true, /not straightened/],
])("%s is a 500 that says so, for cell and board", async (_what, spec, write, why) => {
  await writeLog(dir, [spec]);
  if (write) await put("boards", "000110.webp", await gridBoard(BORDER));
  const c = await cell("e4", 64);
  expect(c.status).toBe(500);
  expect((await c.json()).error).toMatch(why);
  const b = await board(128);
  expect(b.status).toBe(500);
  expect(await b.text()).toMatch(why);
});

test("the matte is the correction when there is one, SAM's cut otherwise, 404 when neither", async () => {
  await writeLog(dir, [row()]);
  await put("boards", "000110.webp", await gridBoard(BORDER));
  expect((await matte(128)).status).toBe(404);
  await put("mattes", "000110.webp", await gridBoard(BORDER, 200));
  expect((await pixels(await matte(128))).mean).toBeGreaterThan(190);
  await put("mattes", "000110.fixed.webp", await gridBoard(BORDER, 0));
  expect((await pixels(await matte(128))).mean).toBeLessThan(10);
});

test("the matte refuses an unstraightened board like the board cut does", async () => {
  await writeLog(dir, [row({ straightened: false })]);
  await put("boards", "000110.webp", await gridBoard(BORDER));
  await put("mattes", "000110.webp", await gridBoard(BORDER, 200));
  const res = await matte(128);
  expect(res.status).toBe(500);
  expect(await res.text()).toMatch(/not straightened/);
});

// ---- ein Bundle OHNE Export: die Handy-JPEGs unter files/sessions/<id>/ -------------------------

async function storedBundle(): Promise<void> {
  const session = path.join(root, "recordings", "phone", "files", "sessions", "20260808-220912");
  await mkdir(path.join(session, "frames"), { recursive: true });
  const jpeg = await sharp({ create: { width: 200, height: 120, channels: 3, background: { r: 30, g: 90, b: 150 } } })
    .jpeg().toBuffer();
  await writeFile(path.join(session, "frames", "0000.jpg"), jpeg);
  const corners = [[20, 20], [180, 20], [180, 100], [20, 100]];
  await writeFile(path.join(session, "log.jsonl"), `${JSON.stringify({ frame: "frames/0000.jpg", ply: 2, fen: "x", corners })}\n`);
}

test("a bundle that was never exported serves its phone frames, and 404 for a frame it lacks", async () => {
  await storedBundle();
  const b = await pixels(await board(128, "0000", "phone"));
  expect([b.width, b.height]).toEqual([128, 128]);
  const c = await pixels(await cell("e4", 48, "0000", "phone"));
  expect([c.width, c.height]).toEqual([48, 48]);
  near(c.at(24, 24), [30, 90, 150], "the frame's colour");
  expect((await board(128, "0009", "phone")).status).toBe(404);
  expect((await cell("e4", 48, "0009", "phone")).status).toBe(404);
});

// ---- der Stift: Striche der geraden Ansicht landen im Raster der Matte -----------------------------

const pen = (body: object) =>
  mattePost(new Request("http://x/api/matte/g/000110", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ name: "g", stem: "000110" }) });

async function greyWebp(side: number, fill: number): Promise<Buffer> {
  return sharp(Buffer.alloc(side * side, fill), { raw: { width: side, height: side, channels: 1 } }).webp({ lossless: true }).toBuffer();
}

/** RGBA, `{"x,y": up|down}`: rot hebt das Alpha, cyan senkt es (`components/alpha-pen.tsx`). */
async function strokes(side: number, hits: Record<string, "up" | "down">): Promise<string> {
  const data = Buffer.alloc(side * side * 4);
  for (const [at, kind] of Object.entries(hits)) {
    const [x, y] = at.split(",").map(Number);
    const o = (y * side + x) * 4;
    data.set(kind === "up" ? [255, 0, 0, 255] : [0, 255, 255, 255], o);
  }
  return (await sharp(data, { raw: { width: side, height: side, channels: 4 } }).png().toBuffer()).toString("base64");
}

async function fixedAlpha(): Promise<{ at: (x: number, y: number) => number; width: number }> {
  const { data, info } = await sharp(await readFile(path.join(dir, "mattes", "000110.fixed.webp")))
    .greyscale().raw().toBuffer({ resolveWithObject: true });
  return { at: (x, y) => data[y * info.width + x], width: info.width };
}

test("a stroke is read through the row's own board scale and border, the rest stays SAM's", async () => {
  // Brett 16 px im 4-px-Rand, Alpha 24 px, Maske 8 px: Maskenpixel (2,3) ist Alpha (8..9, 10..11).
  await writeLog(dir, [row({ boardSize: 16, boardBorder: 4 })]);
  await put("boards", "000110.webp", await greyWebp(24, 90));
  await put("mattes", "000110.webp", await greyWebp(24, 90));
  expect((await pen({ mask: await strokes(8, { "2,3": "up", "5,1": "down" }) })).status).toBe(200);
  const alpha = await fixedAlpha();
  expect(alpha.width).toBe(24);
  expect([alpha.at(8, 10), alpha.at(9, 11)]).toEqual([255, 255]);
  expect([alpha.at(7, 10), alpha.at(10, 10), alpha.at(2, 3)]).toEqual([90, 90, 90]);
  // (5,1) der Maske: Alpha x 14..15, y 6..7 — radiert.
  expect([alpha.at(14, 6), alpha.at(15, 7), alpha.at(16, 6)]).toEqual([0, 0, 90]);
});

test("clear writes an empty alpha of SAM's size, restore takes the correction back", async () => {
  await writeLog(dir, [row()]);
  await put("mattes", "000110.webp", await greyWebp(20, 200));
  expect((await pen({ clear: true })).status).toBe(200);
  const cleared = await fixedAlpha();
  expect([cleared.width, cleared.at(10, 10)]).toEqual([20, 0]);
  expect((await pen({ restore: true })).status).toBe(200);
  await expect(readFile(path.join(dir, "mattes", "000110.fixed.webp"))).rejects.toThrow(/ENOENT/);
});
