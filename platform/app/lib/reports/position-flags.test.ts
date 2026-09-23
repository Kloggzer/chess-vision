import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { loadAuditFlags } from "@/lib/reports/audit-flags";
import { loadCorrectionViolations } from "@/lib/reports/correction-violations";
import { dataDir, gameDir } from "@/lib/session-store/recordings";
import { loadFrameHands } from "@/lib/reports/frame-hands";
import { loadHandFlags } from "@/lib/reports/hand-flags";
import { loadMatte, matteCensus } from "@/lib/session-store/matte";
import { clearMeasurementCache } from "@/lib/measurement";
import { loadModelReads } from "@/lib/session-store/model-reads";
import { loadPositionFlags, positionFlagsPath } from "@/lib/reports/position-flags";
import { gemessen, tempDataRoot } from "@/lib/test-fixtures";
import { unusableCells } from "@/lib/session-store/unusable-cells";

const fail = vi.hoisted(() => ({ on: null as null | ((file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: "stat" | "readdir", file: string, rest: unknown[]) => {
    try {
      fail.on?.(String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real[name] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
  };
});

function blowUpOn(needle: string, code: string) {
  fail.on = (file) => {
    if (file.includes(needle)) throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

let dir: string;
beforeEach(async () => {
  fail.on = null;
  dir = await tempDataRoot("position-flags");
  await mkdir(path.join(dir, "reports"), { recursive: true });
  clearMeasurementCache();
});

const write = (text: string) => writeFile(path.join(dir, "reports", "position-flags.jsonl"), text, "utf8");

const HEAD = '{"_settle_limit": 15.0, "_seen_min": 0.5, "_written_at": "2026-08-22T09:00:00+00:00"}';
const row = (square: string, dev: number) =>
  `{"session_id": "rg-g", "frame": "000100", "square": "${square}", "fen_label": "wP", ` +
  `"ply": 3, "dev": ${dev}, "cov": 0.02, "seen": 0.98, "reason": "changed"}`;

test("the independent temporal score survives loading without becoming coverage", async () => {
  await write(JSON.stringify({ ...JSON.parse(row("a2", 18)), reason: "temporal", temporal_score: 0.43 }));
  expect(gemessen(await loadPositionFlags()).rows[0]).toMatchObject({
    reason: "temporal", temporal_score: 0.43, dev: 18, matte_cov: 0.02,
  });
});

test("die größte Abweichung zuerst — dort ist am ehesten wirklich etwas anderes im Bild", async () => {
  await write(`${HEAD}\n${row("a2", 18.4)}\n${row("a3", 41.2)}\n`);

  const { rows } = gemessen(await loadPositionFlags());

  expect(rows.map((r) => [r.square, r.dev])).toEqual([
    ["a3", 41.2],
    ["a2", 18.4],
  ]);
  expect(rows[0]).toEqual({
    session_id: "rg-g", frame: "000100", square: "a3", fen_label: "wP",
    dev: 41.2, matte_cov: 0.02, reason: "changed",
  });
});

test("keine Datei ist NICHT GEMESSEN — die Lane rendert `—`, nicht 0", async () => {
  expect(positionFlagsPath()).toBe(path.join(dir, "reports", "position-flags.jsonl"));
  expect(await loadPositionFlags()).toEqual({ measured: false });
});

test("Kopfzeile, halber Schwanz und Zeile ohne Messwert werden übersprungen, nicht fatal", async () => {
  await write(`${HEAD}\n{"session_id": "rg-g", "square": "a2"}\n${row("a3", 9)}\n{"session_id": "rg-g", "squ`);

  const { rows } = gemessen(await loadPositionFlags());

  expect(rows.map((r) => r.square)).toEqual(["a3"]);
});

/** Eine kaputte Zeile MITTENDRIN kann kein Schreiber erklaeren; still uebersprungen hiess sie weniger Treffer. */
test("eine kaputte Zeile mittendrin ist keine Messung mit weniger Treffern", async () => {
  await write(`${HEAD}\n{"session_id": "rg-g", "square"\n${row("a3", 9)}\n`);

  await expect(loadPositionFlags()).rejects.toThrow(/beschaedigte/);
});

test("eine Aufnahme ohne `settle-scan` steht in der Kopfzeile und wird weitergereicht", async () => {
  const head = '{"_settle_limit": 15.0, "_unmeasured": ["rg-a", "rg-b"]}';
  await write(`${head}\n${row("a2", 18.4)}\n`);

  const { unmeasured, rows } = gemessen(await loadPositionFlags());

  expect(unmeasured).toEqual(["rg-a", "rg-b"]);
  expect(rows).toHaveLength(1);
});

test("eine Kopfzeile aus der Zeit vor dem Feld behauptet nicht, alles sei gemessen", async () => {
  await write(`${HEAD}\n${row("a2", 18.4)}\n`);

  expect(gemessen(await loadPositionFlags()).unmeasured).toEqual([]);
});

// `present: false` heisst "Producer lief nie"; ein LESEFEHLER darf das nicht behaupten (die Geschwister schluckten ihn, gecacht).
const NAME = "2026-09-21-11-00-00";
const report = (file: string) => path.join(dataDir(), "reports", file);
const CASES: { what: string; file: () => string; load: () => Promise<unknown> }[] = [
  { what: "position-flags", file: () => report("position-flags.jsonl"), load: loadPositionFlags },
  { what: "audit-flags", file: () => report("audit-flags.jsonl"), load: loadAuditFlags },
  { what: "hand-flags", file: () => report("hand-flags.jsonl"), load: loadHandFlags },
  { what: "frame-hands", file: () => report("frame-hands.jsonl"), load: loadFrameHands },
  { what: "correction-violations", file: () => report("correction-violations.jsonl"), load: loadCorrectionViolations },
  { what: "model-reads", file: () => path.join(gameDir(NAME), "model-reads.jsonl"), load: () => loadModelReads(NAME) },
];

for (const { what, file, load } of CASES) {
  test(`${what}: eine unlesbare Datei ist keine Aussage`, async () => {
    // Verzeichnis statt Datei: `stat` gelingt, `readFile` wirft EISDIR — der Weg eines Rechtefehlers.
    await mkdir(file(), { recursive: true });
    await expect(load()).rejects.toThrow();
  });
}

test("ein unlesbares matte.jsonl ist kein handfreies Brett", async () => {
  await mkdir(path.join(gameDir("g"), "matte.jsonl"), { recursive: true });
  await expect(loadMatte("g")).rejects.toThrow();
});

// Das Alter der Flags ist die zweite Messung: `newestInput` las jeden I/O-Fehler als „keine Eingaben", die Flags alterten nie.
async function auditFixture(): Promise<void> {
  await writeFile(
    path.join(dir, "reports", "audit-flags.jsonl"),
    JSON.stringify({ session_id: "g", frame: "000001", square: "e4", fen_label: "wP", predicted: "empty", prob: 0.9, margin: 0.5 }) + "\n",
    "utf8",
  );
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
  await writeFile(path.join(dir, "recordings", "g", "matte.jsonl"), "{}\n", "utf8");
}

test("ein I/O-Fehler am Aufnahme-Verzeichnis ist kein „keine Eingaben\"", async () => {
  await auditFixture();
  blowUpOn("recordings", "EACCES");
  await expect(loadAuditFlags()).rejects.toThrow(/EACCES/);
});

test("ein I/O-Fehler auf einer matte.jsonl macht die Flags nicht jung", async () => {
  await auditFixture();
  blowUpOn("matte.jsonl", "EMFILE");
  await expect(loadAuditFlags()).rejects.toThrow(/EMFILE/);
});

test("ein I/O-Fehler auf der Flag-Datei selbst ist keine ungelaufene Messung", async () => {
  await auditFixture();
  blowUpOn("audit-flags.jsonl", "EACCES");
  await expect(loadAuditFlags()).rejects.toThrow(/EACCES/);
});

test("und ohne Aufnahmen bleiben die Flags eine gelaufene Messung", async () => {
  await auditFixture();
  const flags = await loadAuditFlags();
  expect(flags.measured && flags.value.rows.length).toBe(1);
});

// EMFILE kommt, wenn die Strom-Seite ueber 40 Aufnahmen faechert; die Leser lasen es als "keine Datei".
async function recording(name: string, files: Record<string, string>): Promise<void> {
  const at = path.join(dir, "recordings", name);
  await mkdir(at, { recursive: true });
  for (const [file, text] of Object.entries(files)) await writeFile(path.join(at, file), text, "utf8");
}

test("ein EMFILE auf matte.jsonl ist keine leere Matte", async () => {
  await recording("g", { "matte.jsonl": `${JSON.stringify({ frame: "000010", coverage: { e4: 0.9 } })}\n` });
  blowUpOn(".jsonl", "EMFILE");
  await expect(loadMatte("g")).rejects.toMatchObject({ code: "EMFILE" });
});

test("ein EMFILE auf unusable-cells.jsonl holt keine abgehakte Zelle zurueck", async () => {
  await recording("rg-2026-09-22-00-00-00", {
    "unusable-cells.jsonl": `${JSON.stringify({ session_id: "2026-09-22-00-00-00", frame: "000010", square: "e4", unusable: true })}\n`,
  });
  blowUpOn(".jsonl", "EMFILE");
  await expect(unusableCells("rg-2026-09-22-00-00-00")).rejects.toMatchObject({ code: "EMFILE" });
});

test("ein EMFILE auf log.jsonl meldet keinen erledigten Matte-Stapel", async () => {
  await recording("g2", {
    "matte.jsonl": "",
    "log.jsonl": `${JSON.stringify({ board: "boards/000010.webp", dirty_reason: "occluded" })}\n`,
  });
  blowUpOn(".jsonl", "EMFILE");
  await expect(matteCensus("g2")).rejects.toMatchObject({ code: "EMFILE" });
});
