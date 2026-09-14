import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, it } from "vitest";
import { nextStep } from "@/lib/chain";
import { videoInput } from "@/lib/jobs";

/**
 * `chain.videoOf` accepts a bundle whose only video sits beside `files/` (the shape the comment
 * names: 2026-08-30-14-33-02), so the chain offers `label`. `jobs.videoInput` looks only inside
 * `files/sessions/<newest>` and answers with a reason — the job is recorded `skipped`, which
 * `backlog.blocker` reads as the no-retry marker, and the recording is stuck in Reparatur.
 */
const NAME = "2026-08-30-14-33-02";
let data: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-mirror-"));
  process.env.CHESSLAB_DATA_DIR = data;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
  await writeFile(path.join(data, "recordings", NAME, "video.mp4"), "x", "utf8");
});

it("finds the same mirrored video the chain offered the label button for", async () => {
  // The chain's own reading of this bundle: a video is there, so `label` is the step.
  expect(nextStep({
    video: path.join(data, "recordings", NAME, "video.mp4"), videoBroken: null, offeredPgn: null,
    hasReference: false, hasPhoneRecord: false, hasCandidate: false, confirmed: false,
    hasSession: false, mattes: { done: 0, total: 0, target: 0, reported: 0 },
    hasTemporalPass: false, hasModelReads: false, useless: null,
  })).toBe("label");

  const found = await videoInput(NAME);
  expect(found, "BUG: videoInput has no mirrored fallback — the offered step dead-ends").not.toHaveProperty("reason");
});
