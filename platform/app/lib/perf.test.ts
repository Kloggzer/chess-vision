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
