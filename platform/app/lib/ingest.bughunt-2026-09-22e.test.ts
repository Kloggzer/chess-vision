/**
 * Das Transfer-Ledger ist das einzige Protokoll darueber, was vom Telefon je angekommen ist.
 * Ein Lesefehler wurde zu „gar keine Transfers", ein unlesbares Token-File zu „erster Start"
 * (und damit fast zu einem zweiten Token), ein Fehler am Inbox-Baum zu „nichts in Flug".
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | ((op: string, file: string) => void) }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  // Ein synchroner Wurf liefe am `.catch` des Lesers vorbei und liesse die Gegenprobe gruen.
  const hop = (name: string, file: string, rest: unknown[]) => {
    try {
      fail.on?.(name, String(file));
    } catch (error) {
      return Promise.reject(error);
    }
    return (real as unknown as Record<string, (...a: unknown[]) => unknown>)[name](file, ...rest);
  };
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => hop("stat", file, rest),
    readdir: (dir: string, ...rest: unknown[]) => hop("readdir", dir, rest),
    readFile: (file: string, ...rest: unknown[]) => hop("readFile", file, rest),
  };
});

function blowUpOn(needle: string, code: string, ops = ["stat", "readdir", "readFile"]) {
  fail.on = (op, file) => {
    if (!ops.includes(op) || !file.includes(needle)) return;
    throw Object.assign(new Error(`${code}: ${file}`), { code });
  };
}

beforeEach(() => {
  fail.on = null;
  delete process.env.CHESSLAB_INGEST_TOKEN;
});

async function inbox(prefix: string): Promise<string> {
  const root = await tempDataRoot(prefix);
  const dir = path.join(root, "inbox");
  await mkdir(dir, { recursive: true });
  return dir;
}

test("ein I/O-Fehler auf dem Ledger ist kein „gar keine Transfers\"", async () => {
  const dir = await inbox("ingestledger");
  await writeFile(path.join(dir, "transfers.jsonl"), JSON.stringify({ name: "g" }) + "\n", "utf8");
  blowUpOn("transfers.jsonl", "EACCES", ["readFile"]);
  await expect((await import("@/lib/ingest")).transfers()).rejects.toThrow(/EACCES/);
});

test("ein unlesbares Token ist kein erster Start", async () => {
  const dir = await inbox("ingesttoken");
  await writeFile(path.join(dir, "token"), "abc123\n", "utf8");
  blowUpOn("token", "EACCES", ["readFile"]);
  await expect((await import("@/lib/ingest")).ingestToken()).rejects.toThrow(/EACCES/);
});

test("ein I/O-Fehler am Inbox-Baum ist kein „nichts in Flug\"", async () => {
  await inbox("ingestinbox");
  blowUpOn("inbox", "EACCES", ["readdir"]);
  await expect((await import("@/lib/ingest")).pending()).rejects.toThrow(/EACCES/);
});

test("ein unlesbares Manifest nimmt den Transfer nicht still aus der Liste", async () => {
  const dir = await inbox("ingestmanifest");
  const staging = path.join(dir, "2026-09-22-00-00-00");
  await mkdir(staging, { recursive: true });
  await writeFile(path.join(staging, "manifest.json"), JSON.stringify({ sessionId: "20260922-000000", files: [{ path: "sessions/s1", bytes: 1 }] }), "utf8");
  blowUpOn("manifest.json", "EACCES", ["readFile"]);
  await expect((await import("@/lib/ingest")).pending()).rejects.toThrow(/EACCES/);
});

test("und ohne Inbox bleibt alles leer, mit Ledger kommt die Zeile durch", async () => {
  const dir = await inbox("ingestok");
  const { transfers, pending, ingestToken } = await import("@/lib/ingest");
  expect(await pending()).toEqual([]);
  expect(await transfers()).toEqual([]);
  const token = await ingestToken();
  expect(token).toMatch(/^[0-9a-f]{16}$/);
  await writeFile(path.join(dir, "transfers.jsonl"), JSON.stringify({ name: "g" }) + "\n", "utf8");
  expect((await transfers()).length).toBe(1);
});
