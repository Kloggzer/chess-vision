import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { GET as hello } from "@/app/api/ingest/hello/route";
import {
  appendChunk,
  checkRelPath,
  complete,
  declare,
  ingestToken,
  pending,
  transferName,
  transfers,
  validateManifest,
} from "@/lib/ingest/ingest";
import { tempDataRoot } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir";
const fail = vi.hoisted(() => ({ on: null as null | ((op: Op, file: string) => string | null) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.catch` vorbei.
  const hop = (op: Op, file: string, rest: unknown[]) => {
    const code = fail.on?.(op, String(file)) ?? null;
    if (code) return Promise.reject(Object.assign(new Error(`${code}: ${file}`), { code }));
    return (real[op] as (...a: unknown[]) => unknown)(file, ...rest);
  };
  return {
    ...real,
    stat: (f: string, ...r: unknown[]) => hop("stat", f, r),
    readFile: (f: string, ...r: unknown[]) => hop("readFile", f, r),
    readdir: (f: string, ...r: unknown[]) => hop("readdir", f, r),
  };
});

const eacces = (op: Op, needle: string) => {
  fail.on = (o, file) => (o === op && file.includes(needle) ? "EACCES" : null);
};

let data: string;
let inbox: string;

beforeEach(async () => {
  fail.on = null;
  delete process.env.CHESSLAB_INGEST_TOKEN;
  data = await tempDataRoot("ingest");
  inbox = path.join(data, "inbox");
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
    const landed = path.join(data, "recordings", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
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

  it("appends once when two runs push the same chunk at the same time", async () => {
    const { name } = await declare(manifest(6));
    const file = "sessions/20260813-193423/log.jsonl";
    const both = await Promise.allSettled([appendChunk(name, file, 0, stream("abc")), appendChunk(name, file, 0, stream("abc"))]);

    expect(both.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await declare(manifest(6))).have[file]).toBe(3);
  });

  it("restarts a file whose staged bytes overshoot the declaration", async () => {
    const { name } = await declare(manifest(6));
    const file = "sessions/20260813-193423/log.jsonl";
    await appendChunk(name, file, 0, stream("abcdef"));
    await appendChunk(name, file, 6, stream("abcdef"));

    expect((await declare(manifest(6))).have[file]).toBe(0);
    await appendChunk(name, file, 0, stream("abcdef"));
    expect((await complete(name)).status).toBe("landed");
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
    const landed = path.join(data, "recordings", name, "files", "sessions", "20260813-193423", "log.jsonl");
    expect(await readFile(landed, "utf8")).toBe("abcdef");
    expect(await readFile(path.join(data, "inbox", "transfers.jsonl"), "utf8")).toContain('"status":"landed"');
  });

  it("counts a file that is already in realgames as transferred", async () => {
    const landed = path.join(data, "recordings", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
    await mkdir(landed, { recursive: true });
    await writeFile(path.join(landed, "log.jsonl"), "abcdef");

    const { have } = await declare(manifest(6));
    expect(have["sessions/20260813-193423/log.jsonl"]).toBe(6);
  });

  async function duplicate(): Promise<{ name: string; landed: string }> {
    const landed = path.join(data, "recordings", "2026-08-13-19-34-23", "files", "sessions", "20260813-193423");
    await mkdir(landed, { recursive: true });
    await writeFile(path.join(landed, "log.jsonl"), "ORIGINAL");
    const { name } = await declare(manifest(3));
    await appendChunk(name, "sessions/20260813-193423/log.jsonl", 0, stream("new"));
    return { name, landed };
  }

  it("holds a duplicate in the inbox rather than writing over the session on disk", async () => {
    const { name, landed } = await duplicate();
    const row = await complete(name);

    expect(row.status).toBe("held");
    expect(await readFile(path.join(landed, "log.jsonl"), "utf8")).toBe("ORIGINAL");
    expect((await stat(path.join(data, "inbox", name, "sessions", "20260813-193423", "log.jsonl"))).size).toBe(3);
  });

  // `complete` strich die `.partial`-Endungen VOR der Duplikat-Pruefung; der Retry des Handys bekam 409.
  it("answers a retried seal of a held transfer with the same verdict", async () => {
    const { name, landed } = await duplicate();
    expect((await complete(name)).status).toBe("held");

    const again = await complete(name).catch((e: unknown) => e);
    expect(again, "BUG: the retry reports an incomplete transfer that is in fact complete")
      .toMatchObject({ status: "held" });
    expect(await readFile(path.join(landed, "log.jsonl"), "utf8")).toBe("ORIGINAL");
  });
});

// Jeder Lesefehler hiess „nichts da": keine Transfers, erster Start, nichts in Flug, nichts hochgeladen.
describe("ein I/O-Fehler ist kein „nichts da\"", () => {
  const NAME = "2026-08-13-19-34-23";
  const FILE = { path: "sessions/20260813-193423/video.mp4", bytes: 4 };
  const video = { sessionId: "20260813-193423", files: [FILE] };

  async function staged(partial: string): Promise<string> {
    const staging = path.join(inbox, NAME);
    await mkdir(path.join(staging, path.dirname(FILE.path)), { recursive: true });
    await writeFile(path.join(staging, "manifest.json"), JSON.stringify(video));
    await writeFile(path.join(staging, FILE.path + ".partial"), partial);
    return staging;
  }

  beforeEach(() => mkdir(inbox, { recursive: true }));

  test("ein I/O-Fehler auf dem Ledger ist kein „gar keine Transfers\"", async () => {
    await writeFile(path.join(inbox, "transfers.jsonl"), JSON.stringify({ name: "g" }) + "\n", "utf8");
    eacces("readFile", "transfers.jsonl");
    await expect(transfers()).rejects.toThrow(/EACCES/);
  });

  test("ein unlesbares Token ist kein erster Start", async () => {
    await writeFile(path.join(inbox, "token"), "abc123\n", "utf8");
    eacces("readFile", "token");
    await expect(ingestToken()).rejects.toThrow(/EACCES/);
  });

  test("ein I/O-Fehler am Inbox-Baum ist kein „nichts in Flug\"", async () => {
    eacces("readdir", "inbox");
    await expect(pending()).rejects.toThrow(/EACCES/);
  });

  test("ein unlesbares Manifest nimmt den Transfer nicht still aus der Liste", async () => {
    const staging = path.join(inbox, "2026-09-22-00-00-00");
    await mkdir(staging, { recursive: true });
    await writeFile(path.join(staging, "manifest.json"), JSON.stringify({ sessionId: "20260922-000000", files: [{ path: "sessions/s1", bytes: 1 }] }), "utf8");
    eacces("readFile", "manifest.json");
    await expect(pending()).rejects.toThrow(/EACCES/);
  });

  test("und ohne Inbox bleibt alles leer, mit Ledger kommt die Zeile durch", async () => {
    expect(await pending()).toEqual([]);
    expect(await transfers()).toEqual([]);
    const token = await ingestToken();
    expect(token).toMatch(/^[0-9a-f]{16}$/);
    await writeFile(path.join(inbox, "transfers.jsonl"), JSON.stringify({ name: "g" }) + "\n", "utf8");
    expect((await transfers()).length).toBe(1);
  });

  test("ein EACCES auf der gelandeten Datei ist kein „noch nichts hochgeladen\"", async () => {
    const landed = path.join(data, "recordings", NAME, "files", FILE.path);
    await mkdir(path.dirname(landed), { recursive: true });
    await writeFile(landed, "abcd");
    fail.on = (op, file) => (op === "stat" && file === landed ? "EACCES" : null);
    await expect(declare(video)).rejects.toThrow(/EACCES/);
  });

  test("ein EACCES auf dem Ziel ist kein „Ziel frei\"", async () => {
    await staged("abcd");
    const target = path.join(data, "recordings", NAME, "files");
    fail.on = (op, file) => (op === "stat" && file === target ? "EACCES" : null);
    await expect(complete(NAME)).rejects.toThrow(/EACCES/);
  });

  test("ein EACCES auf dem `.partial` nimmt den Transfer nicht aus „in Flug\"", async () => {
    await staged("ab");
    eacces("stat", ".partial");
    await expect(pending()).rejects.toThrow(/EACCES/);
  });
});

// `complete()` haengt nebenlaeufig an; bis 2026-09-16 kostete eine halbe letzte Zeile die ganze Seite.
describe("transfers() und ein abgerissenes Ledger", () => {
  const LANDED = JSON.stringify({ name: "2026-09-01-10-00-00", status: "landed" });
  const HALF = '{"name": "2026-09-02-10-00';

  const ledger = async (text: string) => {
    await mkdir(inbox, { recursive: true });
    await writeFile(path.join(inbox, "transfers.jsonl"), text, "utf8");
  };

  test("die halbe LETZTE Zeile kostet ihre Zeile, nicht die ganze Seite", async () => {
    await ledger(`${LANDED}\n${HALF}`);
    expect((await transfers()).map((r) => r.name)).toEqual(["2026-09-01-10-00-00"]);
  });

  test("eine kaputte Zeile MITTENDRIN bleibt laut — die kann kein Schreiber erklaeren", async () => {
    await ledger(`${LANDED}\n${HALF}\n${LANDED}\n`);
    await expect(transfers()).rejects.toThrow();
  });
});

describe("ingestToken", () => {
  // Lesen-dann-Schreiben liess zwei gleichzeitige `/hello`-Proben je einen eigenen Token praegen.
  it("hands every concurrent caller the token that is on disk afterwards", async () => {
    const handed = await Promise.all([ingestToken(), ingestToken(), ingestToken()]);
    const stored = (await readFile(path.join(inbox, "token"), "utf8")).trim();
    expect(new Set(handed).size, "BUG: each concurrent caller minted its own token").toBe(1);
    expect(handed.every((t) => t === stored)).toBe(true);
  });
});

// Der Handschlag der Subnetz-Suche: erkennbar per Antwort, und "falscher Rechner" getrennt von "falscher Token".
describe("/api/ingest/hello", () => {
  const ask = async (auth?: string) =>
    (await hello(new Request("http://host/api/ingest/hello", {
      headers: auth ? { authorization: auth } : {},
    }))).json();

  test("the handshake names itself, so a scanner can rule a host out by the answer", async () => {
    const body = await ask();

    expect(body.app).toBe("chesslab-platform");
    expect(body.ingest).toBe(1);
    expect(typeof body.chunk).toBe("number");
  });

  test("paired separates the wrong token from the wrong host", async () => {
    expect((await ask()).paired).toBe(false);
    expect((await ask("Bearer nonsense")).paired).toBe(false);
    expect((await ask(`Bearer ${await ingestToken()}`)).paired).toBe(true);
  });

  test("it says nothing secret — the token never rides in the answer", async () => {
    const token = await ingestToken();

    expect(JSON.stringify(await ask(`Bearer ${token}`))).not.toContain(token);
  });
});
