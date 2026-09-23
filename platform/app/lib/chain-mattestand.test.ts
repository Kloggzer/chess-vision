/**
 * Die Temporal-Sprosse prueft auch die `matte.jsonl` und die Scan-Eingaben, auf denen der Pass lief.
 *
 * Bis 2026-09-23 stempelte `pass.json` nur die `log.jsonl`: SAM-Zeilen nach dem Pass liessen die
 * Sprosse zu (H6, `docs/architektur-review-python-2026-09-23.md`). Die Form schreibt `temporal_matte.pass_inputs`.
 */
import { appendFile, mkdir, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import { chainState } from "@/lib/chain";
import { tempDataRoot } from "@/lib/test-fixtures";

const fail = vi.hoisted(() => ({ on: null as null | string }));

vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    stat: (file: string, ...rest: unknown[]) => fail.on !== null && String(file).endsWith(fail.on)
      ? Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }))
      : (real.stat as (...a: unknown[]) => unknown)(file, ...rest),
  };
});

let data: string;
const NAME = "2026-08-13-12-10-55";
const STEMS = ["1", "2", "3", "4", "5"];

beforeEach(async () => {
  fail.on = null;
  data = await tempDataRoot("mattestand");
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
  await mkdir(path.join(data, "calibration"), { recursive: true });
});

const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);
const passFile = () => path.join(data, "reports", "temporal-mattes", NAME, "pass.json");
const profile = () => path.join(data, "calibration", "p.yaml");

async function stampOf(file: string): Promise<string> {
  const s = await stat(file);
  return `${Math.floor(s.mtimeMs)}:${s.size}`;
}

/** `[rel, size, mtime_ns]` wie `temporal_flags.source_stamp`. */
async function entry(rel: string, file: string): Promise<[string, number, number]> {
  const s = await stat(file, { bigint: true });
  return [rel, Number(s.size), Number(s.mtimeNs)];
}

async function recording(): Promise<void> {
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed: true }));
  await writeFile(game("session.yaml"), "session_id: rg-x\nprofile: p\n");
  await writeFile(profile(), "margin: 0.045\n");
  await writeFile(game("log.jsonl"), STEMS.map((i) => JSON.stringify({
    frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1, dirty: true,
    dirty_reason: "occluded", settle_dev: [1.0],
  })).join("\n") + "\n");
  await writeFile(game("matte.jsonl"),
    STEMS.map((frame) => JSON.stringify({ frame, ply: 1, coverage: { a8: 0.9 } })).join("\n") + "\n");
  await writeFile(game("model-reads.jsonl"),
    JSON.stringify({ _model: "runs/p4a-80-clahe", _source: { log: await stampOf(game("log.jsonl")) } }) + "\n");
}

async function pass(withInputs = true): Promise<void> {
  await mkdir(path.dirname(passFile()), { recursive: true });
  const inputs = {
    matte: await stampOf(game("matte.jsonl")),
    scan: [await entry("log.jsonl", game("log.jsonl")), await entry("session.yaml", game("session.yaml")),
           await entry("profile:p", profile())],
  };
  await writeFile(passFile(), JSON.stringify({
    upserted: 0, _source: { log: await stampOf(game("log.jsonl")) }, ...(withInputs ? { _inputs: inputs } : {}),
  }));
}

async function later(file: string): Promise<void> {
  const t = new Date(Date.now() + 60_000);
  await utimes(file, t, t);
}

it("schliesst die Sprosse, solange matte.jsonl und Profil so liegen wie beim Pass", async () => {
  await recording();
  await pass();
  const state = await chainState(NAME);
  expect(state.step).toBe("labeln");
  expect(state.passInputsUnknown).toBe(false);
});

it("macht die Sprosse wieder auf, wenn nach dem Pass eine SAM-Zeile dazukommt", async () => {
  await recording();
  await pass();
  await appendFile(game("matte.jsonl"), JSON.stringify({ frame: "3", ply: 1, coverage: { a8: 0.0 } }) + "\n");
  const state = await chainState(NAME);
  expect(state.step).toBe("temporal");
  expect(state.hasTemporalPass).toBe(false);
  expect(state.reason).toMatch(/matte\.jsonl/);
});

it("macht die Sprosse wieder auf, wenn das Profil nach dem Pass geaendert wurde", async () => {
  await recording();
  await pass();
  await writeFile(profile(), "margin: 0.050\n");
  await later(profile());
  const state = await chainState(NAME);
  expect(state.step).toBe("temporal");
  expect(state.reason).toMatch(/Profil/);
});

it("eine Datei, die schon beim Pass fehlte und weiter fehlt, ist kein Wechsel", async () => {
  await recording();
  await mkdir(path.dirname(passFile()), { recursive: true });
  await writeFile(passFile(), JSON.stringify({
    _source: { log: await stampOf(game("log.jsonl")) },
    _inputs: { matte: await stampOf(game("matte.jsonl")), scan: [["profile:gone", null, null]] },
  }));
  expect((await chainState(NAME)).step).toBe("labeln");
});

it("ein alter Pass ohne _inputs gilt wie bisher, meldet aber: Stand unbekannt", async () => {
  await recording();
  await pass(false);
  await appendFile(game("matte.jsonl"), JSON.stringify({ frame: "3", ply: 1, coverage: { a8: 0.0 } }) + "\n");
  const state = await chainState(NAME);
  expect(state.step).toBe("labeln");
  expect(state.passInputsUnknown).toBe(true);
});

it("ein Lesefehler am Profil ist kein Urteil ueber den Pass — er wirft", async () => {
  await recording();
  await pass();
  fail.on = "p.yaml";
  await expect(chainState(NAME)).rejects.toThrow(/EACCES/);
});
