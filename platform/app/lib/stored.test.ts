import { mkdtemp, mkdir, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import sharp from "sharp";
import { applyMat, boardToImage } from "@/lib/warp";
import {
  storedBoardPng,
  storedCellPng,
  storedFit,
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
  session = path.join(root, "recordings", BUNDLE, "files", "sessions", ID);
  await mkdir(path.join(session, "frames"), { recursive: true });
  await mkdir(path.join(root, "reports"), { recursive: true });
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

/** The producer's sidecar: `0000` fitted, `0001` given up on — the two paths in one file.
 *  The mtime is bumped explicitly: rewrites inside one test land within the stat resolution,
 *  and the mtime-keyed cache would silently serve the previous variant. */
let fitStamp = 0;
const writeFit = async (extra: object = {}) => {
  const file = path.join(session, "quad-fit.json");
  await writeFile(
    file,
    JSON.stringify({
      margin: 0,
      frames: { "0000": { corners: FIELD, align_worst_px: 2.7, ...extra } },
      failed: ["0001"],
      source_margin: 0.045,
    }) + "\n",
    "utf8",
  );
  const bumped = new Date(Date.now() + ++fitStamp * 1000);
  await utimes(file, bumped, bumped);
};

/** What `grid_line_fracs` writes: 9 positions per axis, fractions of the field side. */
const MESH = {
  x: [0.001, 0.126, 0.251, 0.376, 0.5, 0.625, 0.75, 0.874, 0.999],
  y: [0.002, 0.127, 0.25, 0.375, 0.501, 0.624, 0.749, 0.875, 1.001],
};

/** The same lines with tilts — the barrel-signature stage. */
const TILTED = {
  ...MESH,
  tx: [-0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.015, 0.02],
  ty: [0.018, 0.013, 0.009, 0.004, 0, -0.005, -0.009, -0.014, -0.019],
};

/** And with the parabola term — the curved stage. */
const CURVED = {
  ...TILTED,
  cx: [0.011, 0.008, 0.005, 0.002, -0.001, -0.004, -0.007, -0.01, -0.013],
  cy: [-0.012, -0.009, -0.006, -0.002, 0.001, 0.004, 0.008, 0.011, 0.014],
};

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
});

test("a stored frame renders as a square image of the asked-for size", async () => {
  await writeLog(row(0));
  const png = await storedBoardPng(BUNDLE, "0000", 64);
  const meta = await sharp(png).metadata();
  expect([meta.format, meta.width, meta.height]).toEqual(["webp", 64, 64]);
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

test("tilts ride the mesh when valid, and malformed tilts drop one stage, never the offsets", async () => {
  await writeLog(row(0), row(1));
  await writeFit({ grid_lines: TILTED });
  const [stored] = await storedSessions(BUNDLE);
  expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh).toEqual(TILTED);

  const badTilts = [
    { ...TILTED, tx: TILTED.tx.slice(0, 8) },
    { ...TILTED, ty: [...TILTED.ty.slice(0, 8), 0.06] },
    { ...TILTED, tx: [...TILTED.tx.slice(0, 8), "0.01"] },
    { x: TILTED.x, y: TILTED.y, tx: TILTED.tx },
  ];
  for (const lines of badTilts) {
    await writeFit({ grid_lines: lines });
    expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh, JSON.stringify(lines)).toEqual(MESH);
  }
});

test("curvature rides on tilts when valid, and a malformed pair only costs its own stage", async () => {
  await writeLog(row(0), row(1));
  await writeFit({ grid_lines: CURVED });
  const [stored] = await storedSessions(BUNDLE);
  expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh).toEqual(CURVED);

  // A silent revert of the limit to 0.02 must fail here: 004251's outer lines carry 0.046. As the
  // SMOOTH ramp a lens makes — a lone 0.046 beside the old values is what `smoothMeshCurvature`
  // rightly flattens, and pinning that shape would pin a defect.
  const real = { ...CURVED, cx: [0.046, 0.0345, 0.023, 0.0115, 0, -0.0115, -0.023, -0.0345, -0.046] };
  await writeFit({ grid_lines: real });
  expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh).toEqual(real);

  const badCurvs = [
    { ...CURVED, cx: CURVED.cx.slice(0, 8) },
    { ...CURVED, cy: [...CURVED.cy.slice(0, 8), 0.08] },
    { ...CURVED, cx: [...CURVED.cx.slice(0, 8), "0.01"] },
    { ...TILTED, cx: CURVED.cx },
  ];
  for (const lines of badCurvs) {
    await writeFit({ grid_lines: lines });
    expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh, JSON.stringify(lines)).toEqual(TILTED);
  }
  // Broken tilts drop curvature WITH them — never a curved cut on an unproven tilt stage.
  await writeFit({ grid_lines: { ...CURVED, tx: [...CURVED.tx.slice(0, 8), 0.06] } });
  expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh).toEqual(MESH);
});

test("grid lines ride along when complete, and a malformed mesh reads as none", async () => {
  await writeLog(row(0), row(1));
  await writeFit({ grid_lines: MESH });
  const [stored] = await storedSessions(BUNDLE);
  expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh).toEqual(MESH);

  const bad = [
    { x: [0, 1], y: [0, 1] },
    { x: [...MESH.x.slice(0, 8), null], y: MESH.y },
    { x: [...MESH.x.slice(0, 8), "0.999"], y: MESH.y },
    { x: [...MESH.x.slice(0, 8), 0.5], y: MESH.y },
    "012345678",
  ];
  for (const lines of bad) {
    await writeFit({ grid_lines: lines });
    expect(storedQuad(await storedFit(stored.dir), stored.rows[0]).mesh, JSON.stringify(lines)).toBeUndefined();
  }
});

test("a stored cell renders through every stage: curved, perspective, scalar, and no mesh", async () => {
  await writeLog(row(0), row(1));
  for (const lines of [CURVED, TILTED, MESH]) {
    await writeFit({ grid_lines: lines });
    for (const stem of ["0000", "0001"]) {
      const png = await storedCellPng(BUNDLE, stem, "e4", 48);
      const meta = await sharp(png).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(["webp", 48, 48]);
    }
  }
  await expect(storedCellPng(BUNDLE, "0009", "e4", 48)).rejects.toThrow(/no stored frame/);
});

test("without a sidecar nothing moves: no file, no fit, the marker quad as before", async () => {
  await writeLog(row(0));
  const [stored] = await storedSessions(BUNDLE);
  expect(await storedFit(stored.dir)).toBeNull();
  expect(storedQuad(null, stored.rows[0])).toEqual({ corners: CORNERS, margin: 0.045, fitted: false });
  const png = await storedBoardPng(BUNDLE, "0000", 32);
  expect((await sharp(png).metadata()).width).toBe(32);
});

