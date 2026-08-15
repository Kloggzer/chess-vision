import { expect, test } from "vitest";
import { failureParts, logName, trimPaths } from "./failure";

test("the job runner's shape splits at — see", () => {
  expect(failureParts("training-video-pack exited 1 — see C:\\chess\\data\\inbox\\jobs\\a.log")).toEqual({
    text: "training-video-pack exited 1",
    log: "C:\\chess\\data\\inbox\\jobs\\a.log",
    code: null,
  });
});

test("the tool's shape splits at (exit n, log) and keeps the code", () => {
  const { text, log, code } = failureParts(
    'recording ends at video-002.mp4: could not open "C:\\chess\\data\\realgames\\x\\video.mp4" (exit 1, C:\\chess\\jobs\\b.label.log)',
  );
  expect(text).toBe('recording ends at video-002.mp4: could not open video.mp4');
  expect(logName(log ?? "")).toBe("b.label.log");
  expect(code).toBe(1);
});

test("a reason without a log keeps its words", () => {
  expect(failureParts("no sessions/ in the transfer")).toEqual({
    text: "no sessions/ in the transfer",
    log: null,
    code: null,
  });
});

test("trimPaths leaves file names, not directories", () => {
  expect(trimPaths('ffmpeg -i "C:\\a b\\video.mp4" -crf 18 D:/out/clip.mp4')).toBe("ffmpeg -i video.mp4 -crf 18 clip.mp4");
});

/** The job ledger truncates its own reason, so the last path can end mid-word and unclosed. */
test("trimPaths survives a path the ledger cut in half", () => {
  expect(trimPaths('Could not open input "C:\\chess\\data\\realgames\\2026-0')).toBe("Could not open input 2026-0");
});
