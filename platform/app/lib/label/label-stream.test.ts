import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { appendCorrections } from "@/lib/session-store/corrections";
import { dataDir, gameDir } from "@/lib/session-store/recordings";
import { FILES, fenLabels } from "@/lib/fen";
import { loadLabelStream, type StreamCell } from "@/lib/label/label-stream";
import { NO_AUDIT, NO_HAND, NO_POSITION, laneCount, laneEmpty, laneFrames, openBoards, openCells, openFrames } from "@/lib/label/lanes";
import { tempDataRoot, writeSession, type RowSpec } from "@/lib/test-fixtures";

const NAME = "2026-08-19-12-00-00";
const ID = `rg-${NAME}`;
const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SQUARES = [...FILES].flatMap((f) => [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}`));
const key = (c: StreamCell) => `${c.stem}|${c.square}`;

/** [frames] quiet frames, nothing dirty — the whole settled population the control draws from. */
async function fixture(frames: number): Promise<void> {
  const root = await tempDataRoot("stream");
  await writeSession({
    root,
    name: NAME,
    rows: Array.from({ length: frames }, (_, i) => ({ frame: i, fen: FEN })),
  });
}

/** Ein `stale` Frame mit genau einer `matte.jsonl`-Zeile. */
async function matted(row: RowSpec, matte: object): Promise<void> {
  const dir = await writeSession({
    root: await tempDataRoot("stream-matte"), name: NAME,
    rows: [{ dirty: true, ...row, extra: { dirty_reason: "stale", ...row.extra } }],
  });
  await writeFile(path.join(dir, "matte.jsonl"), JSON.stringify(matte) + "\n", "utf8");
}

const control = async () => (await loadLabelStream()).cells;

const report = async (file: string, text: string) => {
  await mkdir(path.join(dataDir(), "reports"), { recursive: true });
  await writeFile(path.join(dataDir(), "reports", file), text, "utf8");
};

test("the sample renews: judging every drawn cell draws a fresh set, never an empty lane", async () => {
  await fixture(400);
  const first = await control();
  expect(first).toHaveLength(180);
  // Die alte Ziehung war blind: immer dieselben Zellen, die Lane stand nach einer Runde leer.
  await appendCorrections(
    first.map((c) => ({ session_id: ID, frame: c.stem, square: c.square, label: c.fen_label })),
    "reviewed",
  );
  const second = await control();
  expect(second).toHaveLength(180);
  const seen = new Set(first.map(key));
  expect(second.filter((c) => seen.has(key(c)))).toEqual([]);
  const stream = await loadLabelStream();
  expect(openCells(stream, "control")).toHaveLength(180);
  expect(laneCount(stream, "control")).toEqual({ n: 180, total: 180 });
});

test("the draw spreads over the whole recording and over the 64 squares", async () => {
  await fixture(400);
  const cells = await control();
  const frames = cells.map((c) => Number(c.stem)).sort((a, b) => a - b);
  // Ein Los je Scheibe der Aufnahme — sonst misst die Stichprobe eine Minute statt der Partie.
  expect(new Set(frames).size).toBe(cells.length);
  expect(frames[0]).toBeLessThan(3);
  expect(frames[frames.length - 1]).toBeGreaterThan(395);
  expect(new Set(cells.map((c) => c.square)).size).toBeGreaterThan(40);
});

test("the draw is identical on a second load, so the list cannot resize under the cursor", async () => {
  await fixture(400);
  expect((await control()).map(key)).toEqual((await control()).map(key));
});

test("every settled cell judged: the lane is empty and says the sample is exhausted", async () => {
  await fixture(2);
  const labels = fenLabels(FEN);
  await appendCorrections(
    ["000000", "000001"].flatMap((frame) =>
      SQUARES.map((square) => ({ session_id: ID, frame, square, label: labels[square] ?? "empty" })),
    ),
    "reviewed",
  );
  const stream = await loadLabelStream();
  expect(stream.cells).toEqual([]);
  expect(laneCount(stream, "control")).toEqual({ n: 0, total: 0 });
  // „leer" ist wahr, aber die falsche Auskunft: nichts wartet, WEIL nichts mehr übrig ist.
  expect(laneEmpty("control")).toContain("erschöpft");
  expect(laneEmpty("all")).toContain("nichts wartet");
});

test("a reported dirty frame survives the reload — the note is on disk, so the mark must be", async () => {
  await fixture(20);
  const { appendReviewNotes } = await import("@/lib/session-store/review-notes");
  await appendReviewNotes([
    { session_id: ID, frame: "000003", verdict: "dirty-frame" },
    { session_id: ID, frame: "000007", verdict: "dirty-frame" },
    { session_id: ID, frame: "000009", verdict: "matte-ok" },
  ]);
  const { sessions } = await loadLabelStream();
  // `matte-ok` answers the alpha, not a hand: the frame keeps no mark from it.
  expect(sessions[0].reportedDirty.sort()).toEqual(["000003", "000007"]);
});

// SAMs Absage ist kein gemattetes Brett (CLAUDE.md): `skipped` darf an der Stromgrenze nicht wegfallen.
test("Kontrolle: eine echte Matte nimmt das strittige Frame aus der Lane", async () => {
  await matted({ frame: 100 }, { frame: "000100", coverage: { e5: 0.4 }, concepts: {} });
  const stream = await loadLabelStream();
  expect(laneFrames(stream, "frames")).toHaveLength(1);
  expect(openFrames(stream, "frames")).toHaveLength(0);
});

test("ein von SAM ABGELEHNTES Frame bleibt eine offene Frage", async () => {
  await matted({ frame: 100 }, { frame: "000100", skipped: "zone too big" });
  const stream = await loadLabelStream();
  expect(
    openFrames(stream, "frames").map((b) => b.stem),
    "BUG: `skipped` erreicht den Strom nicht — die Absage liest sich als fertige Matte",
  ).toEqual(["000100"]);
});

// Eine ueberall-0-Matte (`clearAlpha` + recut) ist eine Messung; Python schneidet das Frame.
const allZero = Object.fromEntries(SQUARES.map((sq) => [sq, 0]));
const zeroRow: RowSpec = { frame: 0, fen: FEN, extra: { settle_dev: [1.0, 2.0] } };

test("Kontrolle: eine Matte mit einer gemessenen Verdeckung rettet das `stale` Brett", async () => {
  await matted(zeroRow, { frame: "000000", coverage: { ...allZero, h6: 0.9 }, concepts: {} });
  expect(openBoards(await loadLabelStream(), "all")).toHaveLength(1);
});

test("eine geleerte Matte ist eine MESSUNG, keine fehlende — das Brett bleibt labelbar", async () => {
  await matted(zeroRow, { frame: "000000", coverage: allZero, concepts: {} });
  expect(openBoards(await loadLabelStream(), "all")).toHaveLength(1);
});

// Die Naht `measured: false` -> `null` -> `—`: ein Lesefehler ist keine leere Messung.
test("kein Bericht heisst `null`, nicht die leere Liste — die Lane sagt es dann auch", async () => {
  await fixture(2);
  const stream = await loadLabelStream();
  expect([stream.audit, stream.hands, stream.positions]).toEqual([null, null, null]);
  expect(stream.positionsUnmeasured).toEqual([]);
  expect(stream.handScanned).toEqual([false]);
  const { n, why } = laneCount(stream, "audit");
  expect(n).toBeNull();
  for (const grund of [NO_AUDIT, NO_POSITION, NO_HAND]) expect(why).toContain(grund);
});

test("ein Bericht mit null Treffern ist eine Messung: die Lane zaehlt 0 statt `—`", async () => {
  await fixture(2);
  await report("position-flags.jsonl", '{"_settle_limit": 45.0, "_unmeasured": ["rg-x"]}\n');
  const stream = await loadLabelStream();
  expect(stream.positions).toEqual([]);
  expect(stream.positionsUnmeasured).toEqual(["rg-x"]);
});

test("ein Bericht mit einer Zeile landet auf dem Brett, das ihn traegt", async () => {
  await fixture(2);
  await report("position-flags.jsonl",
    `{"session_id": "${ID}", "frame": "000000", "square": "e2", "fen_label": "wP", ` +
    '"dev": 41.2, "matte_cov": null, "reason": "changed"}\n');
  const stream = await loadLabelStream();
  expect(stream.positions).toHaveLength(1);
  expect(stream.positions?.[0]).toMatchObject({ session: 0, stem: "000000", square: "e2", dev: 41.2 });
});

test("ein unlesbarer Bericht ist keine leere Lane, sondern ein Fehler", async () => {
  await fixture(2);
  // Verzeichnis statt Datei: `stat` gelingt, `readFile` wirft EISDIR.
  await mkdir(path.join(dataDir(), "reports", "hand-flags.jsonl"), { recursive: true });
  await expect(loadLabelStream()).rejects.toThrow();
});

test("ein unlesbares `model-reads.jsonl` faellt nicht mehr als `rows: []` durch die Naht", async () => {
  await fixture(2);
  await mkdir(path.join(gameDir(NAME), "model-reads.jsonl"), { recursive: true });
  await expect(loadLabelStream()).rejects.toThrow();
});

// `cell_rule.classification_eligible`: der Verlust maskiert verdeckte UND zu dunkle Zellen. Die Lane
// fragte bis 2026-09-23 nur die Coverage — und legte damit dunkle Zellen vor, die kein Kopf lernt.
test("eine dunkle, sichtbare Zelle ist keine Frage — der Verlust maskiert sie wie eine verdeckte", async () => {
  await fixture(2);
  const read = (square: string, bright: number) =>
    JSON.stringify({ session_id: ID, frame: "000000", square, fen_label: "wP", bright, probs: { wP: 1.0 } });
  await writeFile(path.join(gameDir(NAME), "model-reads.jsonl"),
    [JSON.stringify({ _model: "runs/m" }), read("e2", 12.0), read("d2", 80.0)].join("\n") + "\n", "utf8");
  const flag = (square: string) => `{"session_id": "${ID}", "frame": "000000", "square": "${square}", ` +
    '"fen_label": "wP", "dev": 41.2, "matte_cov": null, "reason": "changed"}';
  await report("position-flags.jsonl", `${flag("e2")}\n${flag("d2")}\n`);
  const stream = await loadLabelStream();
  expect(openCells(stream, "audit").map((c) => c.square), "e2 liegt bei 12 von 255 unter CELL_DARK_MIN")
    .toEqual(["d2"]);
});
