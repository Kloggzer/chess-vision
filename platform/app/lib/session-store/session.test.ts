import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { loadSession } from "@/lib/session-store/session";
import { type RowSpec, sessionRow, tempDataRoot, writeLog, writeSession } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => boolean) }));

// Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) =>
      fail.on?.(String(file))
        ? Promise.reject(Object.assign(new Error(`EMFILE: ${file}`), { code: "EMFILE" }))
        : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

/** Die Zeile des AUFRUFERS hinter der Tuer: dieselbe Datei fragen auch andere Module. */
const caller = () => (new Error().stack ?? "").split("\n").slice(1).find((l) => !/session\.test|measurement/.test(l)) ?? "";

/** Two plies, committed at frames 100 and 200 — one interval, 100 frames wide, at 25 fps. */
const MOVES = [
  { ply: 1, san: "e4", frame: 100, fen_after: "x" },
  { ply: 2, san: "e5", frame: 200, fen_after: "y" },
];

let root: string;
let dir: string;

beforeEach(async () => {
  fail.on = null;
  root = await tempDataRoot("session");
  dir = await writeSession({ root, moves: MOVES });
});

const write = (...rows: RowSpec[]) => writeLog(dir, rows);

/** Dirty by default — a frame with no hand in it is the `settled` case, tested on its own. */
const row = (frame: number, extra: Partial<RowSpec> = {}): RowSpec => ({
  frame,
  fen: "x",
  dirty: true,
  ...extra,
});

test("a frame is placed by which commit it is nearer, in frames and seconds", async () => {
  await write(row(110), row(190));
  const { byStem } = await loadSession("g");

  const after = byStem.get("000110")!;
  expect(after.phase).toBe("after");
  expect(after.since).toBe(10);
  expect(after.to).toBe(90);
  // 25 fps: ten frames is 0.4 s, and the chip prints seconds, not frames.
  expect(after.sinceS).toBeCloseTo(0.4);

  const before = byStem.get("000190")!;
  expect(before.phase).toBe("before");
  expect(before.to).toBe(10);
});

test("a quiet row is `settled` wherever it sits — the exporter's word, not the arithmetic", async () => {
  // Nearer the NEXT commit, so the side arithmetic would say `before`; without a hand in the
  // frame there is no side to be on.
  await write(row(195, { dirty: false }));
  expect((await loadSession("g")).byStem.get("000195")!.phase).toBe("settled");
});

test("the boundary belongs to `after` — a tie is not the arriving move", async () => {
  await write(row(150));
  expect((await loadSession("g")).byStem.get("000150")!.phase).toBe("after");
});

test("unknown_squares travel with the row", async () => {
  await write(row(195, { extra: { unknown_squares: ["e7", "e5"] } }), row(105));
  const { byStem } = await loadSession("g");
  expect(byStem.get("000195")!.unknown).toEqual(["e7", "e5"]);
  expect(byStem.get("000105")!.unknown).toEqual([]);
});

test("the last ply has no closing commit, so its interval never reads `before`", async () => {
  await write(row(9000, { ply: 2 }));
  const last = (await loadSession("g")).byStem.get("009000")!;
  expect(last.phase).toBe("after");
  expect(last.to).toBe(Number.POSITIVE_INFINITY);
  // An open interval must not print "Infinity s" at the labeler.
  expect(Number.isFinite(last.toS)).toBe(false);
});

test("the session cache follows candidate.json even while log.jsonl is unchanged", async () => {
  await write(row(110));
  const before = (await loadSession("g")).byStem.get("000110")!.sinceS;

  await writeFile(
    path.join(dir, "candidate.json"),
    JSON.stringify({ name: "g", clock: { fps: 50 }, moves: MOVES }),
    "utf8",
  );

  expect(
    (await loadSession("g")).byStem.get("000110")!.sinceS,
    "candidate.json changed the clock, so cached session seconds must be invalidated",
  ).toBe(before / 2);
});

// `realgames/export.py` stroemt in `log.jsonl`: die halbe LETZTE Zeile ist ein laufender Export, kein Defekt.
test("eine halb geschriebene letzte Zeile kostet die Seite nicht", async () => {
  await write(row(110), row(190));
  await appendFile(path.join(dir, "log.jsonl"), '{"frame": "frames/0099', "utf8");
  expect((await loadSession("g")).rows.length).toBe(2);
});

test("eine kaputte Zeile MITTEN drin wird gemeldet, nicht verschluckt", async () => {
  const line = (frame: number) => JSON.stringify(sessionRow(row(frame)));
  await writeFile(path.join(dir, "log.jsonl"), [line(110), '{"kaputt', line(190)].join("\n") + "\n", "utf8");
  await expect(loadSession("g")).rejects.toThrow(/beschaedigte Zeile/);
});

// Ein EMFILE auf `candidate.json` traf den Cache-Stand von vor dem Kandidaten und schnitt mit alter Geometrie.
test("ein EMFILE auf candidate.json ist kein Schluessel „none\"", async () => {
  await write(row(110));
  fail.on = (file) => file.endsWith("candidate.json") && caller().includes("session.ts");
  await expect(loadSession("g")).rejects.toThrow(/EMFILE/);
});
