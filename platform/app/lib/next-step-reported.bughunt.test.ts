import { expect, it } from "vitest";
import { nextStep } from "@/lib/chain";

/**
 * `matteCensus.reported` counts hand-flagged frames that are NOT in the `occluded` pile, and both
 * `startStep`'s `--reported` branch and `stepHint`'s "kämen sonst nie dran" exist for them. But
 * `nextStep` only looks at `done < target`, so once the pile target is met the matte step is never
 * offered again and those frames are unreachable.
 */
const EXPORTED = {
  video: "v", videoBroken: null, offeredPgn: null, hasReference: false, hasPhoneRecord: false,
  hasCandidate: true, confirmed: true, hasSession: true,
  hasSettle: true, outdated: {}, reason: "", hasTemporalPass: true, hasModelReads: true, useless: null,
};

it("offers matte again for frames a human reported outside the pile", () => {
  const { step } = nextStep({ ...EXPORTED, mattes: { done: 80, total: 80, target: 80, reported: 5, reportedOpen: 5 } });
  expect(step, "BUG: reported frames never reach the --reported branch").toBe("matte");
});

it("still moves on when nothing was reported", () => {
  expect(nextStep({ ...EXPORTED, mattes: { done: 80, total: 80, target: 80, reported: 0, reportedOpen: 0 } }).step).toBe("labeln");
});
