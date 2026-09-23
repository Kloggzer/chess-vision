import { expect, test } from "vitest";
import { isJobStep, JOB_STEPS } from "@/lib/job-steps";
import { visibleSteps } from "@/lib/label/step-lane";

test("Jobs sind die Maschinen-Sprossen, nicht die Seiten des Menschen und nicht die Kette", () => {
  for (const step of JOB_STEPS) expect(isJobStep(step)).toBe(true);
  for (const step of ["confirm", "labeln", "chain", "", null]) expect(isJobStep(step)).toBe(false);
});

test("die Seitenleiste zeigt die Jobs in Kettenreihenfolge", () => {
  const all = Object.fromEntries(JOB_STEPS.map((s) => [s, 1])) as Record<(typeof JOB_STEPS)[number], number>;
  expect(visibleSteps({ waiting: all, running: null })).toEqual(["chain", ...JOB_STEPS]);
  expect(JOB_STEPS).toEqual(["phone-record", "label", "export", "settle-scan", "matte", "temporal", "model-read"]);
});
