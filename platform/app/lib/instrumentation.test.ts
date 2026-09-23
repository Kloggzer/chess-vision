/** `instrumentation.ts`: der Worker startet beim Serverstart und rechnet vor — EIN Worker, auch wenn die
 *  erste Seite waehrenddessen fragt; ein Fehler dabei wird geloggt und haelt den Server nicht an. */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { pyWorkerPid, setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

// Zaehlt seine Starts in einer Datei und merkt sich die Ops; `FAKE_FAIL` laesst `admission` scheitern.
const FAKE = `
import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";
appendFileSync(process.argv[2], "start\\n");
createInterface({ input: process.stdin }).on("line", (line) => {
  const { id, op } = JSON.parse(line);
  appendFileSync(process.argv[2], op + "\\n");
  const fail = op === "admission" && process.env.FAKE_FAIL;
  process.stdout.write(JSON.stringify(fail ? { id, ok: false, error: "kaputt", kind: "OSError" } : { id, ok: true, value: {} }) + "\\n");
});
`;

let dir = "";
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "chesslab-instr-"));
  await writeFile(path.join(dir, "fake.mjs"), FAKE, "utf8");
});

afterEach(async () => {
  await stopPyWorker();
  setPyWorkerCommand(null);
  delete process.env.FAKE_FAIL;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function fake(): Promise<string> {
  const log = path.join(dir, `log-${Math.random().toString(36).slice(2)}.txt`);
  setPyWorkerCommand({ command: process.execPath, args: [path.join(dir, "fake.mjs"), log] });
  return log;
}

const lines = async (log: string) => (await readFile(log, "utf8").catch(() => "")).split("\n").filter(Boolean);

test("im Node-Runtime startet EIN Worker, und die erste Seite reiht sich bei ihm ein", async () => {
  await writeSession({ root: await tempDataRoot("instr"), name: "2026-09-01-10-00-00", rows: [{ frame: 1 }] });
  const log = await fake();
  vi.spyOn(console, "error").mockImplementation(() => undefined); // der Fake kennt `chain_status` nicht
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  const { register, warmPython } = await import("@/instrumentation");
  register();
  const { loadLabelStream } = await import("@/lib/label/label-stream");
  await loadLabelStream();
  await warmPython();
  const seen = await lines(log);
  expect(seen.filter((l) => l === "start")).toHaveLength(1);
  expect(seen.filter((l) => l === "admission").length).toBeGreaterThanOrEqual(2);
});

test("ausserhalb des Node-Runtimes (Edge) startet nichts", async () => {
  await tempDataRoot("instr-edge");
  const log = await fake();
  vi.stubEnv("NEXT_RUNTIME", "edge");
  const { register } = await import("@/instrumentation");
  register();
  await new Promise((r) => setTimeout(r, 200));
  expect(pyWorkerPid()).toBeUndefined();
  expect(await lines(log)).toEqual([]);
});

test("scheitert das Vorwaermen, wird es geloggt und nicht geworfen", async () => {
  await tempDataRoot("instr-fail");
  await fake();
  process.env.FAKE_FAIL = "1";
  const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const { warmPython } = await import("@/instrumentation");
  await expect(warmPython()).resolves.toBeUndefined();
  expect(logged).toHaveBeenCalledOnce();
  expect(String(logged.mock.calls[0][0])).toMatch(/vorwaermen fehlgeschlagen/);
});
