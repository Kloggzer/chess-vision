import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";

/**
 * Der Zettel nannte als Herkunft "Strittige Frames". Einziger Aufrufer ist der Labeln-Strom;
 * die Strittig-Lane ruft die Route nie an.
 */
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "chesslab-verdict-reason-"));
  process.env.CHESSLAB_DATA_DIR = dir;
  await mkdir(path.join(dir, "recordings", "g"), { recursive: true });
});

test("the note names where the verdict really came from", async () => {
  const { POST } = await import("@/app/api/frame-verdict/route");
  await POST(new Request("http://local/api/frame-verdict", {
    method: "POST",
    body: JSON.stringify({ session_id: "rg-g", frame: "000002", verdict: "matte" }),
  }));

  const text = await readFile(path.join(dir, "labels", "review-notes.jsonl"), "utf8");
  const note = JSON.parse(text.split("\n")[0]) as { reason: string };
  expect(note.reason, "BUG: die Strittig-Lane ruft die Route nie").not.toBe("Strittige Frames");
  expect(note.reason).toMatch(/Labeln/);
});
