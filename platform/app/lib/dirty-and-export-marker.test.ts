// Architektur-Review 2026-09-23 auf dem echten Weg; nur der Kindprozess (`adopt_reported_dirty`) ist gefaelscht.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const fake = vi.hoisted(() => ({ script: "", spawned: 0 }));

vi.mock("@/lib/chain/spawn", async (original) => {
  const real = await original<typeof import("@/lib/chain/spawn")>();
  return { ...real, spawnTool: (_bin: string, args: string[], cwd: string) => {
    fake.spawned += 1;
    return real.spawnTool(process.execPath, [fake.script, ...args], cwd);
  } };
});

const FAKE_TOOL = String.raw`
const fs = require("fs"), path = require("path");
const name = process.argv[process.argv.length - 1];
const data = process.env.CHESSLAB_DATA_DIR;
const ctl = path.join(data, "fake-adopt");
fs.mkdirSync(ctl, { recursive: true });
const main = () => {
const me = path.join(ctl, "running-" + process.pid);
fs.writeFileSync(me, "");
fs.appendFileSync(path.join(ctl, "starts"), fs.readdirSync(ctl).filter((f) => f.startsWith("running-")).length + "\n");
const notesFile = path.join(data, "labels", "review-notes.jsonl");
const notes = fs.existsSync(notesFile)
  ? fs.readFileSync(notesFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const wanted = new Set(notes.filter((n) => n.session_id === "rg-" + name && n.verdict === "dirty-frame").map((n) => n.frame));
fs.appendFileSync(path.join(ctl, "read"), "x\n");
const finish = () => {
  if (fs.existsSync(path.join(ctl, "fail"))) {
    process.stderr.write("Contested: log.jsonl waehrend des Laufs geschrieben\n");
    fs.unlinkSync(me);
    fs.appendFileSync(path.join(ctl, "done"), "x\n");
    process.exit(3);
  }
  const logFile = path.join(data, "recordings", name, "log.jsonl");
  const rows = fs.readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const row of rows) {
    const stem = path.basename(row.board || row.frame).split(".")[0];
    if (wanted.has(stem) && !row.dirty) Object.assign(row, { dirty: true, dirty_source: "reported" });
    else if (!wanted.has(stem) && row.dirty_source === "reported") { delete row.dirty; delete row.dirty_source; }
  }
  fs.writeFileSync(logFile, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  fs.unlinkSync(me);
  fs.appendFileSync(path.join(ctl, "done"), "x\n");
};
const wait = () => (fs.existsSync(path.join(ctl, "hold")) ? setTimeout(wait, 20) : finish());
wait();
};
setTimeout(main, fs.existsSync(path.join(ctl, "slow")) ? 400 : 0);
`;

let scriptDir: string;
let data: string;
const NAME = "2026-09-23-10-00-00";
const ctl = (...p: string[]) => path.join(data, "fake-adopt", ...p);
const lines = async (f: string) => ((await readFile(ctl(f), "utf8").catch(() => "")).split("\n").filter(Boolean));

beforeAll(async () => {
  scriptDir = await mkdtemp(path.join(tmpdir(), "chesslab-fake-adopt-"));
  fake.script = path.join(scriptDir, "adopt.cjs");
  await writeFile(fake.script, FAKE_TOOL, "utf8");
});
afterAll(() => rm(scriptDir, { recursive: true, force: true }));

beforeEach(async () => {
  fake.spawned = 0;
  data = await tempDataRoot("dirty-marker");
  mkdirSync(ctl(), { recursive: true });
  await writeSession({ root: data, name: NAME, rows: [1, 2, 3, 4, 5].map((frame) => ({ frame })) });
});

async function note(retract = false) {
  const { POST } = await import("@/app/api/review-notes/route");
  const res = await POST(new Request("http://local/api/review-notes", {
    method: "POST",
    body: JSON.stringify({ rows: [{ session_id: `rg-${NAME}`, frame: "000002", verdict: "dirty-frame" }], retract }),
  }));
  expect(res.status).toBe(200);
  return res.json() as Promise<{ written: number; adoptFailed?: string[] }>;
}

async function dirtyOf(stem: string): Promise<boolean> {
  const text = await readFile(path.join(data, "recordings", NAME, "log.jsonl"), "utf8");
  return text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as { frame: string; dirty?: boolean })
    .some((r) => r.frame.includes(stem) && r.dirty === true);
}

const settle = { timeout: 8000, interval: 50 };

/** `adopt-dirty.ts` haelt `running` ueber den Folgelauf hinweg: erst `false` ist das Ende der Kette. */
const adoptBusy = () =>
  (globalThis as { __chesslabAdoptDirty?: Map<string, { running: boolean }> }).__chesslabAdoptDirty?.get(NAME)?.running === true;

describe("dirty-frame und Widerruf", { timeout: 20_000 }, () => {
  // Ein Folgelauf, der den Test ueberlebt, startet sonst im Datenverzeichnis des NAECHSTEN.
  afterEach(() => vi.waitFor(() => expect(adoptBusy()).toBe(false), settle));

  it("ein Widerruf nach dem Lauf nimmt die gemeldete Hand aus dem Log", async () => {
    await note();
    await vi.waitFor(async () => expect(await dirtyOf("000002")).toBe(true), settle);
    await note(true);
    await vi.waitFor(async () => expect(await dirtyOf("000002"), "BUG: Widerruf startet keine Gegenoperation").toBe(false), settle);
  });

  it("ein Widerruf WAEHREND des Laufs gewinnt", async () => {
    await writeFile(ctl("hold"), "");
    await note();
    await vi.waitFor(async () => expect(await lines("read")).toHaveLength(1), settle);
    await note(true);
    await rm(ctl("hold"));
    await vi.waitFor(async () => expect((await lines("done")).length).toBeGreaterThanOrEqual(1), settle);
    await vi.waitFor(async () => expect(await dirtyOf("000002"), "BUG: der alte Lauf schrieb nach dem Widerruf").toBe(false), settle);
  });

  it("ein Doppelklick startet keinen zweiten Prozess neben dem ersten", async () => {
    await writeFile(ctl("slow"), "");
    await writeFile(ctl("hold"), "");
    await note();
    await note();
    // Jeder gestartete Prozess meldet sich an, solange `hold` steht — ein zweiter zaehlte dann 2.
    await vi.waitFor(async () => expect((await lines("starts")).length).toBe(fake.spawned), settle);
    await rm(ctl("hold"));
    await vi.waitFor(() => expect(adoptBusy()).toBe(false), settle);
    expect((await lines("done")).length).toBe(fake.spawned);
    const concurrent = Math.max(...(await lines("starts")).map(Number));
    expect(concurrent, "BUG: zwei adopt-dirty auf derselben Aufnahme gleichzeitig").toBe(1);
    expect(await dirtyOf("000002")).toBe(true);
    expect(adoptBusy(), "der Folgelauf war noch unterwegs, als der Test sein Ergebnis las").toBe(false);
  });

  it("ein gescheiterter Lauf steht im Job-Status, nicht nur im Log", async () => {
    await writeFile(ctl("fail"), "");
    expect((await note()).adoptFailed).toEqual([]);
    const { jobHistory } = await import("@/lib/chain/ledger");
    await vi.waitFor(async () => {
      const failed = (await jobHistory(NAME)).find((j) => j.kind === "adopt-dirty");
      expect(failed?.state, "BUG: das Scheitern verschwindet im .adopt-dirty.log").toBe("failed");
      expect(failed?.reason).toContain("Contested");
    }, settle);
  });
});

describe("abgebrochener Export", () => {
  async function exportedAndSettled(): Promise<void> {
    const rows = [1, 2, 3, 4, 5].map((frame) => ({ frame, extra: { settle_dev: [1, 2] } }));
    await writeSession({ root: data, name: NAME, rows, candidate: { confirmed: true } });
  }

  it("haelt die Export-Sprosse offen und nennt den Grund", async () => {
    await exportedAndSettled();
    const { chainState } = await import("@/lib/chain/chain");
    expect((await chainState(NAME)).step).not.toBe("export");
    await writeFile(path.join(data, "recordings", NAME, ".export-running"), "export started x\n");
    const state = await chainState(NAME);
    expect(state.step, "BUG: Folgeschritte laufen auf Brettern zweier Generationen").toBe("export");
    expect(state.hasSession).toBe(false);
    expect(state.reason).toMatch(/abgebrochen/);
  });

  it("sperrt die Folgeschritte an der Tuer", async () => {
    await exportedAndSettled();
    const { chainState } = await import("@/lib/chain/chain");
    const offered = (await chainState(NAME)).step!;
    await writeFile(path.join(data, "recordings", NAME, ".export-running"), "export started x\n");
    const { startStep } = await import("@/lib/chain/run");
    const answer = await startStep(NAME, offered);
    expect("error" in answer && answer.status).toBe(409);
  });
});
