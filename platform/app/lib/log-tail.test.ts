import { mkdtemp, open, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, test } from "vitest";
import { logTail } from "@/lib/chain/job-log";
import { absentOnly } from "@/lib/measurement";

/** `tailOf` aus lib/chain/progress.ts vor 2026-09-26, Zeichen fuer Zeichen. */
async function legacyTailOf(file: string): Promise<{ tail: string[]; bytes: number }> {
  const info = await stat(file).catch(absentOnly);
  if (!info) return { tail: [], bytes: 0 };
  const handle = await open(file, "r");
  try {
    const length = Math.min(4096, info.size);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, info.size - length);
    const lines = buffer.toString("utf8").split(/\r?\n/).filter((l) => l.trim());
    return { tail: lines.slice(-4), bytes: info.size };
  } finally {
    await handle.close();
  }
}

/** `jobLogTail` aus lib/chain/job-log.ts vor 2026-09-26, ohne den `job`-Umschlag. */
async function legacyJobLogTail(log: string, lines = 30): Promise<string[]> {
  const info = await stat(log).catch(absentOnly);
  if (!info || info.size === 0) return [];
  const handle = await open(log, "r");
  try {
    const length = Math.min(64 * 1024, info.size);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, info.size - length);
    return buffer.toString("utf8").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).slice(-lines);
  } finally {
    await handle.close();
  }
}

const FIXTURES: Record<string, string> = {
  empty: "",
  short: "$ chesslab replay\r\nstate: at 3,50s   \n\n   \ndecision: ply=4 decider=cnn\n",
  long: Array.from({ length: 5000 }, (_, i) => `line ${i} ${"x".repeat(i % 40)}`).join("\n"),
  unterminated: "a\nb\nc",
};

test.each(Object.keys(FIXTURES))("logTail liest wie beide alten Kopien (%s)", async (key) => {
  const dir = await mkdtemp(path.join(tmpdir(), "log-tail-"));
  const file = path.join(dir, "job.log");
  await writeFile(file, FIXTURES[key]);
  expect(await logTail(file, 64 * 1024, 30)).toEqual({ lines: await legacyJobLogTail(file), bytes: (await stat(file)).size });
  // Einzige gewollte Abweichung: `tailOf` behielt Leerzeichen am Zeilenende.
  const old = await legacyTailOf(file);
  expect(await logTail(file, 4096, 4)).toEqual({ lines: old.tail.map((l) => l.trimEnd()), bytes: old.bytes });
});

test("logTail: eine fehlende Datei ist leer, keine Stoerung", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "log-tail-"));
  expect(await logTail(path.join(dir, "nie.log"), 4096, 4)).toEqual({ lines: [], bytes: 0 });
});
