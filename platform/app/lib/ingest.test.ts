import { mkdtemp, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { appendChunk, checkRelPath, complete, declare, pending, transferName, validateManifest } from "@/lib/ingest";

let data: string;

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-ingest-"));
  process.env.CHESSLAB_DATA_DIR = data;
});

const stream = (text: string) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });

const manifest = (bytes: number) => ({
  sessionId: "20260813-193423",
  device: "phone",
  files: [{ path: "sessions/20260813-193423/log.jsonl", bytes }],
});

describe("transferName", () => {
  it("maps the phone's session id onto the realgames directory name", () => {
    expect(transferName("20260813-193423")).toBe("2026-08-13-19-34-23");
  });

  it("keeps an id that is not a timestamp, as long as it is a safe name", () => {
    expect(transferName("rec-20260808-003957")).toBe("rec-20260808-003957");
    expect(() => transferName("../etc")).toThrow();
  });
});

describe("checkRelPath", () => {
  it("accepts the phone's two roots", () => {
    expect(checkRelPath("sessions/20260813-193423/video.mp4")).toBe("sessions/20260813-193423/video.mp4");
    expect(checkRelPath("games/2026-08-13_1941.json")).toBe("games/2026-08-13_1941.json");
  });

  it("refuses anything that could leave the tree", () => {
    for (const bad of ["../secret", "sessions/../../x", "/etc/passwd", "diagnostics/x.log", "sessions/a/b/c/d"]) {
      expect(() => checkRelPath(bad), bad).toThrow();
    }
  });
});

describe("validateManifest", () => {
  it("refuses a manifest without files", () => {
    expect(() => validateManifest({ sessionId: "20260813-193423", files: [] })).toThrow();
  });

  it("refuses a negative size", () => {
    expect(() => validateManifest({ sessionId: "x", files: [{ path: "games/a.json", bytes: -1 }] })).toThrow();
  });
});

describe("pending", () => {
  it("counts only trees that still hold a partial — a parked duplicate is not in flight", async () => {
    const landed = path.join(data, "realgames", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
    await mkdir(landed, { recursive: true });
    await writeFile(path.join(landed, "log.jsonl"), "abcdef");
    const { name } = await declare(manifest(6));
    expect(await pending()).toEqual([]);

    const row = await complete(name);
    expect(row.status).toBe("held");
    expect(await pending()).toEqual([]);
  });

  it("counts a transfer that stopped half way", async () => {
    const { name } = await declare(manifest(6));
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("abc"));
    expect(await pending()).toEqual([{ name, bytes: 3, files: 1 }]);
  });
});

describe("a transfer", () => {
  it("resumes from what the server already has", async () => {
    const { name, have } = await declare(manifest(6));
    expect(name).toBe("2026-08-13-19-34-23");
    expect(have["sessions/20260813-193423/log.jsonl"]).toBe(0);

    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("abc"));
    const second = await declare(manifest(6));
    expect(second.have["sessions/20260813-193423/log.jsonl"]).toBe(3);
  });

  it("answers a wrong offset with the truth instead of a write", async () => {
    const { name } = await declare(manifest(6));
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("abc"));
    await expect(appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("abc"))).rejects.toMatchObject({ have: 3 });
  });

  it("refuses to complete while a file is short", async () => {
    const { name } = await declare(manifest(6));
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("abc"));
    await expect(complete(name)).rejects.toMatchObject({ conflict: true });
  });

  it("moves a complete tree into realgames and writes the ledger", async () => {
    const { name } = await declare(manifest(6));
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("abc"));
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 3, stream("def"));
    const row = await complete(name);

    expect(row.status).toBe("landed");
    const landed = path.join(data, "realgames", name, "files", "sessions", "20260813-193423", "log.jsonl");
    expect(await readFile(landed, "utf8")).toBe("abcdef");
    expect(await readFile(path.join(data, "inbox", "transfers.jsonl"), "utf8")).toContain('"status":"landed"');
  });

  it("counts a file that is already in realgames as transferred", async () => {
    const landed = path.join(data, "realgames", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
    await mkdir(landed, { recursive: true });
    await writeFile(path.join(landed, "log.jsonl"), "abcdef");

    const { have } = await declare(manifest(6));
    expect(have["sessions/20260813-193423/log.jsonl"]).toBe(6);
  });

  it("holds a duplicate in the inbox rather than writing over the session on disk", async () => {
    const landed = path.join(data, "realgames", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
    await mkdir(landed, { recursive: true });
    await writeFile(path.join(landed, "log.jsonl"), "ORIGINAL");

    const { name } = await declare({ ...manifest(3), files: [{ path: "sessions/20260813-193423/log.jsonl", bytes: 3 }] });
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("new"));
    const row = await complete(name);

    expect(row.status).toBe("held");
    expect(await readFile(path.join(landed, "log.jsonl"), "utf8")).toBe("ORIGINAL");
    expect((await stat(path.join(data, "inbox", name, "sessions", "20260813-193423", "log.jsonl"))).size).toBe(3);
  });
});
