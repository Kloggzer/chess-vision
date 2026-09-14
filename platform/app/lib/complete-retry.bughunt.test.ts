import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, it } from "vitest";
import { appendChunk, complete, declare } from "@/lib/ingest";

/**
 * `complete` strips every `.partial` suffix BEFORE it checks whether the transfer is a duplicate,
 * so the held branch leaves a staging tree the retry can no longer recognise. A phone that loses
 * the response and retries — the resumability this module exists for — gets a 409 for a transfer
 * that in fact arrived, and `declare` then re-uploads the whole tree.
 */
let data: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-complete-"));
  process.env.CHESSLAB_DATA_DIR = data;
});

const stream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); },
  });

const MANIFEST = {
  sessionId: "20260813-193423",
  device: "phone",
  files: [{ path: "sessions/20260813-193423/log.jsonl", bytes: 3 }],
};

it("answers a retried seal of a held transfer with the same verdict", async () => {
  const landed = path.join(data, "recordings", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
  await mkdir(landed, { recursive: true });
  await writeFile(path.join(landed, "log.jsonl"), "ORIGINAL");

  const { name } = await declare(MANIFEST);
  await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("new"));
  expect((await complete(name)).status).toBe("held");

  const again = await complete(name).catch((e: unknown) => e);
  expect(again, "BUG: the retry reports an incomplete transfer that is in fact complete")
    .toMatchObject({ status: "held" });
  expect(await readFile(path.join(landed, "log.jsonl"), "utf8")).toBe("ORIGINAL");
});
