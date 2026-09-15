import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { loadLabelStream } from "@/lib/label-stream";
import { laneFrames, openFrames } from "@/lib/lanes";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

/**
 * SAMs ABSAGE ist kein gemattetes Brett (CLAUDE.md, Fall 3 derselben Falle).
 *
 * `loadMatte` macht aus einer `skipped`-Zeile `coverage: {}` und `loadLabelStream` traegt nur
 * `frame.coverage` in den Strom — das `skipped` faellt an der Grenze weg. `openFrames` liest
 * "es gibt einen Eintrag" als "schon gemattet" und nimmt das Frame aus der Lane. Es liegt kein
 * Alpha da, seine Zellen erreichen die Strittig-Lane also auch nicht: die Frage verschwindet
 * lautlos aus beiden, und `laneCount("frames")` meldet sie als erledigt.
 */
const NAME = "2026-09-16-10-00-00";

async function fixture(matte: object): Promise<void> {
  const root = await tempDataRoot("skipped-lane");
  const dir = await writeSession({
    root, name: NAME,
    rows: [{ frame: 100, dirty: true, extra: { dirty_reason: "stale" } }],
  });
  await writeFile(path.join(dir, "matte.jsonl"), JSON.stringify(matte) + "\n", "utf8");
}

test("Kontrolle: eine echte Matte nimmt das strittige Frame aus der Lane", async () => {
  await fixture({ frame: "000100", coverage: { e5: 0.4 }, concepts: {} });
  const stream = await loadLabelStream();
  expect(laneFrames(stream, "frames")).toHaveLength(1);
  expect(openFrames(stream, "frames")).toHaveLength(0);
});

test("ein von SAM ABGELEHNTES Frame bleibt eine offene Frage", async () => {
  // Was `matte.py` schreibt, wenn SAM ablehnt: ein Frame, kein Alpha, KEINE `coverage`.
  await fixture({ frame: "000100", skipped: "zone too big" });
  const stream = await loadLabelStream();
  expect(
    openFrames(stream, "frames").map((b) => b.stem),
    "BUG: `skipped` erreicht den Strom nicht — die Absage liest sich als fertige Matte",
  ).toEqual(["000100"]);
});
