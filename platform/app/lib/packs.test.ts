import { expect, test } from "vitest";
import { decidedRatio, readSummary } from "@/lib/packs";

/** A pack from 2026-08-14 on. */
const NEW_SCHEMA = {
  sampled_frames: 338,
  accepted_frames: 35,
  accepted_crops: 2240,
  quarantine_frames: 3,
  quarantine_crops: 192,
  occluded_proposal_frames: 63,
  occluded_proposal_crops: 925,
  model: "real14-80",
};

/** A pack written before it — no quarantine column exists at all. */
const OLD_SCHEMA = {
  sampled_frames: 1442,
  clean_frames: 35,
  clean_crops: 2240,
  occluded_frames: 34,
  occluded_crops: 444,
  model: "id35-80",
};

test("the newer key set is read as it is written", () => {
  const summary = readSummary(NEW_SCHEMA);
  expect(summary.schema).toBe("accepted");
  expect(summary.accepted).toEqual({ frames: 35, crops: 2240 });
  expect(summary.quarantine).toEqual({ frames: 3, crops: 192 });
  expect(summary.occluded).toEqual({ frames: 63, crops: 925 });
});

test("the older key set maps onto the same shape and invents no quarantine", () => {
  const summary = readSummary(OLD_SCHEMA);
  expect(summary.schema).toBe("clean");
  expect(summary.accepted).toEqual({ frames: 35, crops: 2240 });
  expect(summary.quarantine).toBeNull();
  expect(summary.occluded).toEqual({ frames: 34, crops: 444 });
  expect(decidedRatio(summary)).toBeNull();
});

test("the ratio's denominator is the DECIDED frames, not the sampled ones", () => {
  const decided = decidedRatio(readSummary(NEW_SCHEMA));
  expect(decided).toEqual({ decided: 38, quarantined: 3, ratio: 3 / 38 });
  // The other plausible denominator is an order of magnitude away, which is why it is named.
  expect(decided!.ratio).toBeGreaterThan(3 / 338 * 5);
});

test("a summary that is missing everything is empty, never zero", () => {
  const summary = readSummary({});
  expect(summary.accepted).toEqual({ frames: null, crops: null });
  expect(summary.model).toBeNull();
  expect(readSummary(null).sampled).toBeNull();
});
