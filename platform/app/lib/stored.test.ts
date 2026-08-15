import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import sharp from "sharp";
import { applyMat, boardToImage } from "@/lib/warp";
import {
  storedBoardPng,
  storedFit,
  storedProgress,
  storedProgressOf,
  storedQuad,
  storedSessionId,
  storedSessions,
} from "@/lib/stored";

const BUNDLE = "2026-08-08-22-09-12";
const ID = "20260808-220912";
const FEN = "rnbqkb1r/ppp2ppp/3p1n2/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4";
/** [a8, h8, h1, a1] of a 200x120 frame — the marker quad the tracker logs. */
const CORNERS = [[20, 20], [180, 20], [180, 100], [20, 100]];
/** What `chesslab fit-stored` measured for `0000`: the PLAYING FIELD, so margin 0. */
const FIELD = [[27, 24], [173, 23], [174, 97], [26, 96]];

const row = (n: number, extra: object = {}) => ({
  frame: `frames/${String(n).padStart(4, "0")}.jpg`,
  ply: n + 2,
  fen: FEN,
  ts: "2026-08-08T20:09:39.634393Z",
  move_san: "d6",
  corners: CORNERS,
  ...extra,
});

let root: string;
let session: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "chesslab-stored-"));
  session = path.join(root, "realgames", BUNDLE, "files", "sessions", ID);
  await mkdir(path.join(session, "frames"), { recursive: true });
  await mkdir(path.join(root, "manifests"), { recursive: true });
  const jpeg = await sharp({
    create: { width: 200, height: 120, channels: 3, background: { r: 30, g: 90, b: 150 } },
  })
    .jpeg()
    .toBuffer();
  for (const stem of ["0000", "0001"]) await writeFile(path.join(session, "frames", `${stem}.jpg`), jpeg);
  process.env.CHESSLAB_DATA_DIR = root;
});

const writeLog = (...rows: object[]) =>
  writeFile(path.join(session, "log.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf8");

/** The producer's sidecar: `0000` fitted, `0001` given up on — the two paths in one file. */
const writeFit = () =>
  writeFile(
    path.join(session, "quad-fit.json"),
    JSON.stringify({
      margin: 0,
      frames: { "0000": { corners: FIELD, align_worst_px: 2.7 } },
      failed: ["0001"],
      source_margin: 0.045,
    }) + "\n",
    "utf8",
  );

/**
 * `packLabeledSession` matches corrections on its `id=` argument, and every pack of these stored
 * sessions ran with `phone-<dir>` — see `session_id` in the `packed_meta.json` of every
 * `data/datasets/phone-stored-…` pack, and the `mm://phone-…` paths in `hard_empty.jsonl`.
 */
test("a stored session is keyed phone-<id>, which is the id the pack reads corrections under", () => {
  expect(storedSessionId(ID)).toBe("phone-20260808-220912");
  expect(() => storedSessionId("../escape")).toThrow();
});

test("the log's rows become boards, chronological, without the ones the pack refuses", async () => {
  await writeLog(row(1), row(0), row(2, { dirty: true }));
  const [stored] = await storedSessions(BUNDLE);
  expect(stored.sessionId).toBe("phone-20260808-220912");
  expect(stored.rows.map((r) => r.stem)).toEqual(["0000", "0001"]);
  expect(stored.rows[0]).toMatchObject({ frame: "frames/0000.jpg", ply: 2, fen: FEN });
});

test("a bundle without a stored session reports nothing rather than an empty one", async () => {
  expect(await storedSessions("nope")).toEqual([]);
  expect(await storedProgress(BUNDLE)).toBeNull();
  expect(await storedProgressOf([BUNDLE, "nope"])).toEqual({});
});

test("a stored frame renders as a square PNG of the asked-for size", async () => {
  await writeLog(row(0));
  const png = await storedBoardPng(BUNDLE, "0000", 64);
  const meta = await sharp(png).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["png", 64, 64]);
  await expect(storedBoardPng(BUNDLE, "0009", 64)).rejects.toThrow(/no stored frame/);
});

/**
 * The whole point of the sidecar: the fitted corners ARE the playing field, so they are warped at
 * the margin the FILE states, and a frame the fit gave up on keeps the logged marker quad.
 */
test("a fitted frame is cut at the sidecar's field quad, an unfitted one at the marker quad", async () => {
  await writeLog(row(0), row(1));
  await writeFit();
  const [stored] = await storedSessions(BUNDLE);
  const fit = await storedFit(stored.dir);

  expect(storedQuad(fit, stored.rows[0])).toEqual({ corners: FIELD, margin: 0, fitted: true, worstPx: 2.7 });
  expect(storedQuad(fit, stored.rows[1])).toEqual({ corners: CORNERS, margin: 0.045, fitted: false });

  // Board (0, 0) is a8 itself at margin 0 — the marker path puts it 4.5 % outside instead.
  const fitted = storedQuad(fit, stored.rows[0]);
  const at = applyMat(boardToImage(fitted.corners, 928, fitted.margin), 0, 0);
  expect([Math.round(at[0]), Math.round(at[1])]).toEqual(FIELD[0]);
});

test("without a sidecar nothing moves: no file, no fit, the marker quad as before", async () => {
  await writeLog(row(0));
  const [stored] = await storedSessions(BUNDLE);
  expect(await storedFit(stored.dir)).toBeNull();
  expect(storedQuad(null, stored.rows[0])).toEqual({ corners: CORNERS, margin: 0.045, fitted: false });
  const png = await storedBoardPng(BUNDLE, "0000", 32);
  expect((await sharp(png).metadata()).width).toBe(32);
});

test("a board counts as seen once either ledger carries a square of it", async () => {
  await writeLog(row(0), row(1));
  expect(await storedProgress(BUNDLE)).toEqual({ boards: 2, seen: 0 });

  const reviewed = { session_id: "phone-20260808-220912", frame: "0000", square: "e4", label: "wP", ts: "t" };
  await writeFile(path.join(root, "manifests", "reviewed.jsonl"), JSON.stringify(reviewed) + "\n", "utf8");
  expect(await storedProgress(BUNDLE)).toEqual({ boards: 2, seen: 1 });

  const thrown = { session_id: "phone-20260808-220912", frame: "0001", verdict: "unusable-board", ts: "t" };
  await writeFile(path.join(root, "manifests", "review-notes.jsonl"), JSON.stringify(thrown) + "\n", "utf8");
  expect(await storedProgressOf([BUNDLE])).toEqual({ [BUNDLE]: { boards: 2, seen: 2 } });
});
