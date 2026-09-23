import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { agreed, groupByPack, parsePerf, shortName, sweepLog } from "@/lib/corpus/perf";
import { countProbs, headerModel, modelReadProvenance, summarize, type Provenance } from "@/lib/corpus/provenance";
import { tempDataRoot } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readFile: (f: string, ...r: unknown[]) => hop("readFile", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
    open: (f: string, ...r: unknown[]) => hop("open", f, r),
  };
});

beforeEach(() => {
  fail.on = null;
});

const FLAT = {
  model: "C:\\x\\data\\models\\id35-80-before-hn-20260812\\model.onnx",
  pack: "C:\\x\\data\\datasets\\labeled-rg-2026-08-08-00-39-57-80",
  crops: 24758,
  boards: 388,
  crop_accuracy: 0.8295904354148154,
  occupied_piece_accuracy: 0.602332003682111,
  phantoms: 331,
  misses: 350,
  top_confusions: [{ true: "bP", pred: "bB", count: 555 }],
};

/** The comparison files key their metrics by model and carry NO pack at all. */
const GROUPED = {
  "id35-80-hn1-turntable": { overall: { crops: 37624, boards: 591, phantoms: 2073, misses: 894 }, sessions: {} },
  "id35-80-hn2-turntable": { overall: { crops: 37624, boards: 591, phantoms: 1900, misses: 900 }, sessions: {} },
};

test("a flat file is one run, labelled by its own model and pack", () => {
  const [run] = parsePerf("ms-champ-realgame-holdout.json", FLAT).runs;
  expect(run.model).toBe("id35-80-before-hn-20260812");
  expect(run.pack).toBe("labeled-rg-2026-08-08-00-39-57-80");
  expect(run.phantoms).toBe(331);
  expect(run.confusions[0]).toEqual({ true: "bP", pred: "bB", count: 555 });
  expect(shortName("data/datasets/turntable80-test-092133")).toBe("turntable80-test-092133");
});

test("a file without a pack keeps that absence — no sibling file fills it in", () => {
  const file = parsePerf("labeled-phone-hn1-vs-hn2.json", GROUPED);
  expect(file.runs.map((run) => run.model)).toEqual(["id35-80-hn1-turntable", "id35-80-hn2-turntable"]);
  expect(file.runs.every((run) => run.pack === null)).toBe(true);

  const groups = groupByPack([parsePerf("flat.json", FLAT), file]);
  const packless = groups.find((group) => group.pack === null)!;
  expect(packless.runs.map((run) => run.file)).toEqual(["labeled-phone-hn1-vs-hn2.json", "labeled-phone-hn1-vs-hn2.json"]);
  // The one rule this strip exists for: model and metric on a line came from the same file.
  const named = groups.find((group) => group.pack === "labeled-rg-2026-08-08-00-39-57-80")!;
  expect(named.runs).toHaveLength(1);
  expect(named.runs[0].file).toBe("flat.json");
});

test("a pack header only states crops and boards the runs agree on", () => {
  const same = parsePerf("a.json", GROUPED).runs;
  expect(agreed(same, "crops")).toBe(37624);
  expect(agreed([...same, ...parsePerf("b.json", FLAT).runs], "crops")).toBeNull();
});

test("the run dir comes off the `_model` header, and absence stays absent", () => {
  expect(headerModel({ _classes: ["empty", "wP"] })).toBeNull();
  expect(headerModel({ _model: "data/models/d16-f0" })).toBe("data/models/d16-f0");
  expect(headerModel({ model: "data/models/d16-f0" })).toBeNull();
});

test("probs are counted by scan, and sessions nobody read stay UNMEASURED, never zero", () => {
  expect(countProbs('{"square":"a1"}\n{"probs":{"empty":0.9}}\n{"probs":{}}')).toBe(2);
  const entries: Provenance[] = [
    { name: "a", rows: 100, probs: 100, model: "data/models/d16-f0", writtenAt: "2026-08-18T22:22:47Z" },
    { name: "b", rows: 40, probs: 40, model: null, writtenAt: null },
    { name: "c", rows: null, probs: null, model: null, writtenAt: null },
  ];
  expect(summarize(entries)).toEqual({
    sessions: 3,
    read: 2,
    withoutModel: 1,
    rows: 140,
    probRows: 140,
    models: ["data/models/d16-f0"],
  });
});

test("ein EACCES auf den Sweep-Log ist kein fehlender Log", async () => {
  await tempDataRoot("perfsweep");
  fail.on = (op, file) => (op === "stat" && file.endsWith(path.join("perf", "sweep_infer_size.log")) ? "EACCES" : null);
  await expect(sweepLog()).rejects.toThrow(/EACCES/);
});

// „1 von 43" darf nie als „1" lesbar werden: ein I/O-Fehler ist kein leerer Korpus.
async function readsFixture(prefix: string): Promise<void> {
  const dir = path.join(await tempDataRoot(prefix), "recordings", "g");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "model-reads.jsonl"), JSON.stringify({ _model: "p4a-80-clahe" }) + "\n{}\n", "utf8");
}

const blowUpOn = (needle: string, code: string) => {
  fail.on = (op, file) => ((op === "stat" || op === "readdir") && file.includes(needle) ? code : null);
};

test("ein I/O-Fehler am Aufnahme-Verzeichnis ist kein leerer Korpus", async () => {
  await readsFixture("provdir");
  blowUpOn("recordings", "EACCES");
  await expect(modelReadProvenance()).rejects.toThrow(/EACCES/);
});

test("ein I/O-Fehler auf model-reads.jsonl ist kein „nie gelesen\"", async () => {
  await readsFixture("provstat");
  blowUpOn("model-reads.jsonl", "EMFILE");
  await expect(modelReadProvenance()).rejects.toThrow(/EMFILE/);
});

test("und eine Aufnahme ohne Lesarten bleibt ungemessen, nicht null", async () => {
  const root = await tempDataRoot("provleer");
  await mkdir(path.join(root, "recordings", "leer"), { recursive: true });
  expect(await modelReadProvenance()).toEqual([{ name: "leer", rows: null, probs: null, model: null, writtenAt: null }]);
});
