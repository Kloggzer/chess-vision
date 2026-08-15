import { expect, test } from "vitest";
import { agreed, groupByPack, parsePerf, shortName } from "@/lib/perf";
import { countProbs, headerModel, summarize, type Provenance } from "@/lib/provenance";

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

test("the header model is read on either level and absence stays absent", () => {
  expect(headerModel({ _thresholds: { hi: 0.7, lo: 0.3 } })).toBeNull();
  expect(headerModel({ _thresholds: { hi: 0.7, model: "real14-ms-s3-hn-bn80" } })).toBe("real14-ms-s3-hn-bn80");
  expect(headerModel({ model: "real14-ms-s3-hn-bn80" })).toBe("real14-ms-s3-hn-bn80");
});

test("probs are counted by scan, and a producer that never ran reports nothing", () => {
  expect(countProbs('{"score":0.1}\n{"probs":{"empty":0.9}}\n{"probs":{}}')).toBe(2);
  const entries: Provenance[] = [
    { name: "a", rows: 100, probs: 100, model: null, source: "parsed" },
    { name: "b", rows: 50, probs: null, model: "m", source: "sidecar" },
  ];
  expect(summarize(entries)).toEqual({
    files: 2,
    withModel: 1,
    rows: 150,
    sidecars: 1,
    counted: 1,
    countedRows: 100,
    withProbs: 1,
    probRows: 100,
    unknown: 1,
  });
});

test("a sidecar-only corpus reports UNKNOWN probs, never zero", () => {
  // The regression: `(e.probs ?? 0)` made every sidecar a file with no probs, so the banner
  // announced "0 von 9 Dateien" the moment the producer started writing sidecars.
  const entries: Provenance[] = [
    { name: "a", rows: 40, probs: null, model: "m", source: "sidecar" },
    { name: "b", rows: 60, probs: null, model: "m", source: "sidecar" },
  ];
  expect(summarize(entries)).toMatchObject({ counted: 0, countedRows: 0, withProbs: 0, probRows: 0, unknown: 2 });
});
