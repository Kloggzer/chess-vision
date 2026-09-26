import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { jobHistory, readLedger } from "@/lib/chain/ledger";
import type { Job } from "@/lib/chain/slot";
import { jsonlRows } from "@/lib/jsonl";

let inbox = "";

beforeEach(async () => {
  const data = await mkdtemp(path.join(tmpdir(), "ledger-read-"));
  vi.stubEnv("CHESSLAB_DATA_DIR", data);
  inbox = path.join(data, "inbox");
  await mkdir(inbox, { recursive: true });
});

/** Die zwei Leser aus lib/chain/ledger.ts vor 2026-09-26, Zeichen fuer Zeichen. */
async function legacyJobHistory(name: string, limit = 20): Promise<Job[]> {
  const rows: Job[] = [];
  try {
    const text = await readFile(path.join(inbox, "jobs.jsonl"), "utf8");
    for (const line of jsonlRows(text)) {
      const row = line as unknown as Job;
      if (row.name === name) rows.push(row);
    }
  } catch (e) {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
  }
  return rows.reverse().slice(0, limit);
}

async function legacyReadLedger(key: (row: Job) => string): Promise<Map<string, Job>> {
  const seen = new Map<string, Job>();
  try {
    const text = await readFile(path.join(inbox, "jobs.jsonl"), "utf8");
    for (const line of jsonlRows(text)) {
      const row = line as unknown as Job;
      seen.set(key(row), row);
    }
  } catch (e) {
    if ((e as { code?: string })?.code !== "ENOENT") throw e;
  }
  return seen;
}

const settle = (p: Promise<unknown>) => p.then((v) => ({ v }), (e: NodeJS.ErrnoException) => ({ e: e.code }));
const byKind = (r: Job) => `${r.name}|${r.kind ?? "job"}`;

const rows = [
  { name: "a", kind: "label", state: "running" },
  { name: "b", kind: "export", state: "done" },
  { name: "a", kind: "label", state: "failed", reason: "exit 1" },
  { name: "a", kind: "matte", state: "done" },
];

test.each([
  ["fehlt", null],
  ["leer", ""],
  ["Zeilen", rows.map((r) => JSON.stringify(r)).join("\n") + "\n"],
  ["Schwanz halb", `${JSON.stringify(rows[0])}\n{"name":"a","ki`],
  ["Verzeichnis", "dir"],
])("die Ledger-Leser lesen wie zuvor (%s)", async (_, text) => {
  const file = path.join(inbox, "jobs.jsonl");
  await rm(file, { recursive: true, force: true });
  if (text === "dir") await mkdir(file);
  else if (text !== null) await writeFile(file, text);
  expect(await settle(jobHistory("a"))).toEqual(await settle(legacyJobHistory("a")));
  expect(await settle(jobHistory("a", 1))).toEqual(await settle(legacyJobHistory("a", 1)));
  expect(await settle(readLedger(byKind))).toEqual(await settle(legacyReadLedger(byKind)));
});
