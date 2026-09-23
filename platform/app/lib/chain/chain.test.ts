import { appendFile, mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { adoptPgn, chainState, nextStep, referenceOrigin } from "@/lib/chain/chain";
import { videoInput } from "@/lib/ingest/ingest";
import { matteCensus, matteSources } from "@/lib/session-store/matte";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

type Op = "stat" | "readFile" | "readdir" | "open";
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
    open: (f: string, ...r: unknown[]) => hop("open", f, r),
  };
});

const failOn = (op: Op, suffix: string, code = "EACCES") => {
  fail.on = (o, file) => (o === op && file.endsWith(suffix) ? code : null);
};

let data: string;
const NAME = "2026-08-13-12-10-55";

beforeEach(async () => {
  fail.on = null;
  data = await tempDataRoot("chain");
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
});

const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);

async function video(): Promise<void> {
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
}

async function candidate(confirmed: boolean): Promise<void> {
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed }));
}

const STEMS = ["1", "2", "3", "4", "5"];

/** Fuenf Bretter auf einem Ply: erst ab `SETTLE_MIN_FRAMES` hat der Scan ueberhaupt etwas zu messen. */
async function exported({ settled = true, dirty = false } = {}): Promise<void> {
  await video();
  await candidate(true);
  await writeFile(game("log.jsonl"), STEMS.map((i) => JSON.stringify({
    frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1,
    ...(dirty ? { dirty: true, dirty_reason: "occluded" } : {}),
    ...(settled ? { settle_dev: [1.0, 2.0] } : {}),
  })).join("\n") + "\n");
}

async function pass(source?: unknown): Promise<void> {
  await mkdir(path.join(data, "reports", "temporal-mattes", NAME), { recursive: true });
  await writeFile(path.join(data, "reports", "temporal-mattes", NAME, "pass.json"),
    JSON.stringify({ upserted: 3, ...(source === undefined ? {} : { _source: source }) }) + "\n");
}

async function reads(source?: unknown): Promise<void> {
  await writeFile(game("model-reads.jsonl"),
    JSON.stringify({ _model: "runs/p4a-80-clahe", ...(source === undefined ? {} : { _source: source }) }) + "\n");
}

/** Der Stempel, den Python schreibt: Mtime in ganzen Millisekunden und Groesse. */
async function stampOf(file: string): Promise<string> {
  const s = await stat(file);
  return `${Math.floor(s.mtimeMs)}:${s.size}`;
}

const logStamp = () => stampOf(game("log.jsonl"));

/** Export, Pass und Lesarten gestempelt: offen sein kann nur noch die Herkunft der Alphas. */
async function exportedAndRead(): Promise<void> {
  await exported({ dirty: true });
  const log = await logStamp();
  await pass({ log });
  await reads({ log });
}

describe("nextStep", () => {
  const base = {
    video: "v",
    videoBroken: null,
    offeredPgn: null,
    hasReference: false,
    hasPhoneRecord: false,
    hasCandidate: false,
    confirmed: false,
    hasSession: false,
    hasSettle: true,
    outdated: {},
    mattes: { done: 0, total: 0, target: 0 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
    hasTemporalPass: false,
    hasModelReads: false,
    useless: null,
  };

  it("offers nothing at all for a game the human called useless", () => {
    expect(nextStep({ ...base, useless: { at: "2026-08-14T20:00:00Z" } }).step).toBeNull();
    expect(nextStep({ ...base, hasCandidate: true, useless: { at: "2026-08-14T20:00:00Z" } }).step).toBeNull();
  });

  it("walks the chain in order", () => {
    const exported = { ...base, hasCandidate: true, confirmed: true, hasSession: true };
    expect(nextStep(base).step).toBe("label");
    expect(nextStep({ ...base, hasCandidate: true }).step).toBe("confirm");
    expect(nextStep({ ...base, hasCandidate: true, confirmed: true }).step).toBe("export");
    expect(nextStep({ ...exported, mattes: { done: 0, total: 12, target: 12 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } }).step).toBe("matte");
    // The temporal pass needs SAM's rows to know what SAM missed — so after matte, before the model.
    expect(nextStep(exported).step).toBe("temporal");
    expect(nextStep({ ...exported, hasTemporalPass: true }).step).toBe("model-read");
    expect(nextStep({ ...exported, hasTemporalPass: true, hasModelReads: true }).step).toBe("labeln");
  });

  it("mattes until the RUN'S TARGET is reached, not until the pile is empty", () => {
    const exported = { ...base, hasCandidate: true, confirmed: true, hasSession: true, hasTemporalPass: true };
    expect(nextStep({ ...exported, mattes: { done: 40, total: 80, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } }).step).toBe("matte");
    expect(nextStep({ ...exported, mattes: { done: 80, total: 80, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } }).step).toBe("model-read");
    // `--all --limit 80`: the biggest sessions must leave this rung, or the chain strands them.
    expect(nextStep({ ...exported, mattes: { done: 80, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } }).step).toBe("model-read");
    expect(nextStep({ ...exported, mattes: { done: 79, total: 394, target: 80 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } }).step).toBe("matte");
    // A session whose frames are all clean has no pile at all; it must not stall on an empty one.
    expect(nextStep({ ...exported, mattes: { done: 0, total: 0, target: 0 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 } }).step).toBe("model-read");
  });

  it("never offers export before a human confirmed — an unconfirmed candidate exports nothing", () => {
    expect(nextStep({ ...base, hasCandidate: true, hasSession: false }).step).toBe("confirm");
  });

  // Ein gemeldetes Frame, das SAM abgelehnt hat, hielt die Sprosse sonst fuer immer offen.
  const read = { ...base, hasCandidate: true, confirmed: true, hasSession: true, hasTemporalPass: true, hasModelReads: true };

  it("nextStep leaves the matte rung once every reported frame got its answer", () => {
    const stuck = { done: 80, total: 80, target: 80, reported: 1, reportedOpen: 0, reportedOrphan: 0, wanted: 0 };
    expect(nextStep({ ...read, mattes: stuck }).step, "BUG: dauerhaft auf `matte` festgenagelt").toBe("labeln");
  });

  it("a reported frame SAM has not answered yet still calls for the step", () => {
    const open = { done: 80, total: 80, target: 80, reported: 1, reportedOpen: 1, reportedOrphan: 0, wanted: 0 };
    expect(nextStep({ ...read, mattes: open }).step).toBe("matte");
  });

  it("begruendet jeden Schritt in einem Satz", () => {
    expect(nextStep({ ...base, hasSettle: false })).toEqual({ step: "label", reason: expect.stringMatching(/\S/) });
    expect(nextStep({ ...base, useless: { at: "2026-08-14T20:00:00Z" } }))
      .toEqual({ step: null, reason: expect.stringContaining("nutzlos") });
    expect(nextStep(read)).toEqual({ step: "labeln", reason: expect.stringMatching(/\S/) });
  });
});

describe("chainState", () => {
  it("reads a freshly transferred bundle as 'label', with its video", async () => {
    await video();
    const state = await chainState(NAME);
    expect(state.step).toBe("label");
    expect(state.video).toContain("video.mp4");
  });

  it("says a bundle without a video has nothing to label", async () => {
    expect((await chainState(NAME)).video).toBeNull();
  });

  it("offers the phone's PGN only while no reference exists", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    expect((await chainState(NAME)).offeredPgn).toContain("2026-08-13_1941.pgn");

    await writeFile(game("reference.pgn"), "1. d4");
    expect((await chainState(NAME)).offeredPgn).toBeNull();
  });

  it("moves to labeln once the session and the model reads exist", async () => {
    await video();
    await candidate(true);
    await writeFile(game("log.jsonl"), JSON.stringify({ board: "boards/1.webp", settle_dev: [1.0] }) + "\n");
    await writeFile(game("model-reads.jsonl"), "{}\n");
    expect((await chainState(NAME)).step).toBe("temporal");
    await pass();
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("counts the alphas against the session's own occluded pile", async () => {
    await video();
    await candidate(true);
    await writeFile(game("log.jsonl"), [
      JSON.stringify({ frame: "1.png", board: "boards/1.webp", dirty: true, dirty_reason: "occluded", settle_dev: [1.0] }),
      JSON.stringify({ frame: "2.png", board: "boards/2.webp", dirty: true, dirty_reason: "occluded" }),
      JSON.stringify({ frame: "3.png", board: "boards/3.webp", dirty: true, dirty_reason: "grid-late" }),
      JSON.stringify({ frame: "4.png", board: "boards/4.webp" }),
    ].join("\n") + "\n");
    await writeFile(game("matte.jsonl"), JSON.stringify({ frame: "1", coverage: {} }) + "\n");
    const state = await chainState(NAME);
    expect(state.mattes).toEqual({ done: 1, total: 2, target: 2 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 });
    expect(state.step).toBe("matte");
  });

  it("a session directory without log.jsonl is NOT an export — the killed-export case", async () => {
    await video();
    await candidate(true);
    await mkdir(game("frames"), { recursive: true });
    expect((await chainState(NAME)).step).toBe("export");
  });

  it("reads a bundle with a record naming its session as 'phone-record', without one as 'label'", async () => {
    await video();
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "index.json"), JSON.stringify([{ id: "2026-08-13_1941" }]));
    await writeFile(game("files", "games", "2026-08-13_1200.json"), JSON.stringify({ sessionId: "20260812-120000" }));
    expect((await chainState(NAME)).step).toBe("label");

    await writeFile(game("files", "games", "2026-08-13_1941.json"), JSON.stringify({ sessionId: "20260813-121055" }));
    const state = await chainState(NAME);
    expect(state.hasPhoneRecord).toBe(true);
    expect(state.step).toBe("phone-record");
  });

  it("the phone's own log.jsonl is not an exported session", async () => {
    await video();
    await candidate(true);
    const log = game("log.jsonl");
    await writeFile(log, JSON.stringify({ frame: 931, ply: 1, fen: "8/8/8/8/8/8/8/8 w - - 0 1", move_san: "d4" }) + "\n");
    expect((await chainState(NAME)).hasSession).toBe(false);

    await writeFile(log, JSON.stringify({ frame: "1.png", board: "boards/1.webp" }) + "\n");
    expect((await chainState(NAME)).hasSession).toBe(true);
  });

  it("a mirrored top-level video.mp4 counts when no session dir has one", async () => {
    await writeFile(game("video.mp4"), "x");
    expect((await chainState(NAME)).video).toBe(game("video.mp4"));

    await video();
    expect((await chainState(NAME)).video).toContain(path.join("sessions", "20260813-121055"));
  });

  it("offers the video the job would take: an older session's video is not the newest session's", async () => {
    await video();
    await mkdir(game("files", "sessions", "20260813-130000"), { recursive: true });
    const job = await videoInput(NAME);
    expect(job).toHaveProperty("reason");
    expect((await chainState(NAME)).video, "die Kette bot einen Knopf an, den der Job verweigert").toBeNull();
  });

  // `queueRows` ruft chainState je Aufnahme in einem `Promise.all`: ein Wurf leerte jede Queue-Seite.
  it("treats a half-written candidate.json as unconfirmed instead of throwing", async () => {
    await writeFile(game("candidate.json"), '{"moves": [], "confir', "utf8");
    const state = await chainState(NAME);
    expect(state.confirmed, "BUG: JSON.parse of a truncated candidate rejects the whole page").toBe(false);
  });
});

describe("settle-scan als Sprosse", () => {
  it("steht zwischen Export und Matten, wenn keine Zeile settle_dev traegt", async () => {
    await exported({ settled: false });
    expect((await chainState(NAME)).step).toBe("settle-scan");
  });

  // Sonst haengt jede winzige Aufnahme fuer immer auf einem Knopf, der nichts zu messen hat.
  it("steht nicht an, wo kein Intervall lang genug zum Messen ist", async () => {
    await exported({ settled: false });
    const rows = [0, 1, 2, 3].map((i) => JSON.stringify({ frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1 }));
    await writeFile(game("log.jsonl"), rows.join("\n") + "\n");
    expect((await chainState(NAME)).step).not.toBe("settle-scan");
  });

  it("ist durch, sobald eine Zeile gemessen ist", async () => {
    await exported();
    expect((await chainState(NAME)).step).not.toBe("settle-scan");
  });
});

describe("Herkunftsstempel", () => {
  it("laesst eine Datei ohne Stempel gelten — alles, was heute auf der Platte liegt", async () => {
    await exported();
    await pass();
    await reads();
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("macht die Sprosse wieder auf, wenn der Stempel nicht zur log.jsonl passt", async () => {
    await exported();
    await pass({ log: "1:2" });
    await reads({ log: await logStamp() });
    const state = await chainState(NAME);
    expect(state.step).toBe("temporal");
    expect(Object.keys(state.outdated)).toContain("temporal");
    expect(state.reason).toMatch(/Export/);
  });

  it("merkt, dass die log.jsonl seit dem Reads-Lauf neu geschrieben wurde", async () => {
    await exported();
    await pass({ log: await logStamp() });
    await reads({ log: await logStamp() });
    expect((await chainState(NAME)).step).toBe("labeln");

    const later = new Date(Date.now() + 60_000);
    await writeFile(game("log.jsonl"), JSON.stringify({ frame: "1.png", board: "b", settle_dev: [1] }) + "\n");
    await utimes(game("log.jsonl"), later, later);
    const state = await chainState(NAME);
    // Ein Re-Export entwertet BEIDE Laeufe, und die Kette faellt auf den frueheren zurueck.
    expect(state.step).toBe("temporal");
    expect(Object.keys(state.outdated).sort()).toEqual(["model-read", "temporal"]);
  });

  // Was ein abgebrochener Lauf hinterlaesst: "nicht gemessen", nicht "ungestempelt".
  it("laesst eine LEERE model-reads.jsonl die Sprosse nicht schliessen", async () => {
    await exported();
    await pass({ log: await logStamp() });
    await writeFile(game("model-reads.jsonl"), "");

    expect((await chainState(NAME)).step).toBe("model-read");
  });

  it("laesst eine halb geschriebene Kopfzeile die Sprosse nicht schliessen", async () => {
    await exported();
    await pass({ log: await logStamp() });
    await writeFile(game("model-reads.jsonl"), '{"_model": "runs/p4a-80-cl');

    expect((await chainState(NAME)).step).toBe("model-read");
  });

  it("nennt einen Reads-Lauf eines ANDEREN Modells veraltet", async () => {
    await exported();
    await pass({ log: await logStamp() });
    await reads({ log: await logStamp(), model: "p4-128" });
    process.env.CHESSLAB_MODEL_READ_RUN = "runs/p4a-80-clahe";
    const state = await chainState(NAME);
    expect(state.step).toBe("model-read");
    expect(state.reason).toMatch(/p4-128/);
  });

  // Jede Stempel-Haelfte faengt einen Re-Export, den die andere durchlaesst (Mutation 2026-09-21).
  it("gleiche Groesse, verschobene Mtime: der Lauf ist veraltet", async () => {
    await exported();
    const s = await stat(game("log.jsonl"));
    await pass({ log: `${Math.floor(s.mtimeMs) - 60_000}:${s.size}` });

    const state = await chainState(NAME);
    expect(state.step, "ein Re-Export gleicher Groesse blieb unbemerkt").toBe("temporal");
    expect(Object.keys(state.outdated)).toContain("temporal");
  });

  it("gleiche Mtime, andere Groesse: der Lauf ist veraltet", async () => {
    await exported();
    const s = await stat(game("log.jsonl"));
    await pass({ log: `${Math.floor(s.mtimeMs)}:${s.size - 40}` });

    const state = await chainState(NAME);
    expect(state.step, "ein Re-Export in derselben Millisekunde blieb unbemerkt").toBe("temporal");
    expect(Object.keys(state.outdated)).toContain("temporal");
  });

  /** Die 1-ms-Toleranz selbst bleibt: Python bodenlegt dieselbe Zeit ueber Sekunden-Floats. */
  it("eine Millisekunde Abstand bei gleicher Groesse gilt weiter", async () => {
    await exported();
    const s = await stat(game("log.jsonl"));
    await pass({ log: `${Math.floor(s.mtimeMs) - 1}:${s.size}` });
    await reads();

    expect((await chainState(NAME)).step).toBe("labeln");
  });
});

// Die Matte-Sprosse prueft Herkunft: sonst schliesst sie auf Alphas von vor dem letzten Re-Export.
describe("Matte-Herkunft", () => {
  async function mattes(rows: Record<string, unknown>[]): Promise<void> {
    await writeFile(game("matte.jsonl"), rows.map((r) => JSON.stringify({ ply: 1, ...r })).join("\n") + "\n");
  }

  it("laesst eine Matte OHNE Stempel gelten — alles, was heute auf der Platte liegt", async () => {
    await exportedAndRead();
    await mattes(STEMS.map((frame) => ({ frame, coverage: { a8: 0.9 } })));
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("schliesst die Sprosse, wenn der Stempel zur log.jsonl passt", async () => {
    await exportedAndRead();
    const _source = { log: await logStamp() };
    await mattes(STEMS.map((frame) => ({ frame, coverage: { a8: 0.9 }, _source })));
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("macht die Sprosse wieder auf, wenn die Alphas vor dem letzten Export geschnitten wurden", async () => {
    await exportedAndRead();
    const fresh = { log: await logStamp() };
    await mattes(STEMS.map((frame, i) => ({ frame, coverage: { a8: 0.9 }, _source: i === 0 ? { log: "1:2" } : fresh })));
    const state = await chainState(NAME);
    expect(state.step).toBe("matte");
    expect(Object.keys(state.outdated)).toContain("matte");
    expect(state.reason).toMatch(/recut-coverage/);
  });

  it("haelt nicht an einer Zeile fest, die dieser Export gar nicht mehr fuehrt", async () => {
    await exportedAndRead();
    const fresh = { log: await logStamp() };
    await mattes([...STEMS.map((frame) => ({ frame, coverage: { a8: 0.9 }, _source: fresh })),
                  { frame: "99", coverage: { a8: 0.9 }, _source: { log: "1:2" } }]);
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("eine Zeile ohne `coverage` ist ungemessen, nicht erledigt", async () => {
    await exportedAndRead();
    await mattes(STEMS.map((frame) => ({ frame })));

    expect((await matteCensus(NAME)).done).toBe(0);
    const state = await chainState(NAME);
    expect(state.step).toBe("matte");
    expect(state.reason).toMatch(/^0 von 5/);
  });

  it("eine spaetere Absage nimmt den Stempel der frueheren Messung zurueck", async () => {
    await exportedAndRead();
    const fresh = { log: await logStamp() };
    await mattes([
      { frame: "1", coverage: { a8: 0.9 }, _source: { log: "1:2" } },
      { frame: "1", skipped: "zone too big", _source: { log: "1:2" } },
      ...STEMS.slice(1).map((frame) => ({ frame, coverage: { a8: 0.9 }, _source: fresh })),
    ]);

    expect(await matteSources(NAME)).toEqual([fresh.log]);
  });
});

// Seit 2026-09-23 stempelt `pass.json` auch matte.jsonl und die Scan-Eingaben (H6, `temporal_matte.pass_inputs`).
describe("Temporal-Sprosse und ihre Eingaben", () => {
  const passFile = () => path.join(data, "reports", "temporal-mattes", NAME, "pass.json");
  const profile = () => path.join(data, "calibration", "p.yaml");

  /** `[rel, size, mtime_ns]` wie `temporal_flags.source_stamp`. */
  async function entry(rel: string, file: string): Promise<[string, number, number]> {
    const s = await stat(file, { bigint: true });
    return [rel, Number(s.size), Number(s.mtimeNs)];
  }

  async function recording(): Promise<void> {
    await exported({ dirty: true });
    await mkdir(path.join(data, "calibration"), { recursive: true });
    await writeFile(game("session.yaml"), "session_id: rg-x\nprofile: p\n");
    await writeFile(profile(), "margin: 0.045\n");
    await writeFile(game("matte.jsonl"),
      STEMS.map((frame) => JSON.stringify({ frame, ply: 1, coverage: { a8: 0.9 } })).join("\n") + "\n");
    await reads({ log: await logStamp() });
  }

  async function passWithInputs(withInputs = true): Promise<void> {
    await mkdir(path.dirname(passFile()), { recursive: true });
    const inputs = {
      matte: await stampOf(game("matte.jsonl")),
      scan: [await entry("log.jsonl", game("log.jsonl")), await entry("session.yaml", game("session.yaml")),
             await entry("profile:p", profile())],
    };
    await writeFile(passFile(), JSON.stringify({
      upserted: 0, _source: { log: await logStamp() }, ...(withInputs ? { _inputs: inputs } : {}),
    }));
  }

  it("schliesst die Sprosse, solange matte.jsonl und Profil so liegen wie beim Pass", async () => {
    await recording();
    await passWithInputs();
    const state = await chainState(NAME);
    expect(state.step).toBe("labeln");
    expect(state.passInputsUnknown).toBe(false);
  });

  it("macht die Sprosse wieder auf, wenn nach dem Pass eine SAM-Zeile dazukommt", async () => {
    await recording();
    await passWithInputs();
    await appendFile(game("matte.jsonl"), JSON.stringify({ frame: "3", ply: 1, coverage: { a8: 0.0 } }) + "\n");
    const state = await chainState(NAME);
    expect(state.step).toBe("temporal");
    expect(state.hasTemporalPass).toBe(false);
    expect(state.reason).toMatch(/matte\.jsonl/);
  });

  it("macht die Sprosse wieder auf, wenn das Profil nach dem Pass geaendert wurde", async () => {
    await recording();
    await passWithInputs();
    await writeFile(profile(), "margin: 0.050\n");
    const t = new Date(Date.now() + 60_000);
    await utimes(profile(), t, t);
    const state = await chainState(NAME);
    expect(state.step).toBe("temporal");
    expect(state.reason).toMatch(/Profil/);
  });

  it("macht die Sprosse wieder auf, wenn session.yaml nach dem Pass geaendert wurde", async () => {
    await recording();
    await passWithInputs();
    await writeFile(game("session.yaml"), "session_id: rg-x\nprofile: q\n");
    const t = new Date(Date.now() + 60_000);
    await utimes(game("session.yaml"), t, t);
    const state = await chainState(NAME);
    expect(state.step).toBe("temporal");
    expect(state.hasTemporalPass).toBe(false);
  });

  it("eine Datei, die schon beim Pass fehlte und weiter fehlt, ist kein Wechsel", async () => {
    await recording();
    await mkdir(path.dirname(passFile()), { recursive: true });
    await writeFile(passFile(), JSON.stringify({
      _source: { log: await logStamp() },
      _inputs: { matte: await stampOf(game("matte.jsonl")), scan: [["profile:gone", null, null]] },
    }));
    expect((await chainState(NAME)).step).toBe("labeln");
  });

  it("ein alter Pass ohne _inputs gilt wie bisher, meldet aber: Stand unbekannt", async () => {
    await recording();
    await passWithInputs(false);
    await appendFile(game("matte.jsonl"), JSON.stringify({ frame: "3", ply: 1, coverage: { a8: 0.0 } }) + "\n");
    const state = await chainState(NAME);
    expect(state.step).toBe("labeln");
    expect(state.passInputsUnknown).toBe(true);
  });

  it("ein Lesefehler am Profil ist kein Urteil ueber den Pass — er wirft", async () => {
    await recording();
    await passWithInputs();
    failOn("stat", "p.yaml");
    await expect(chainState(NAME)).rejects.toThrow(/EACCES/);
  });
});

// Die Kette liest ihren Knopf von der Platte: ein Lesefehler darf nie "der Schritt lief nie" heissen.
describe("Lesefehler sind keine Abwesenheit", () => {
  const g = (...parts: string[]) => path.join(data, "recordings", "g", ...parts);

  async function fixture(): Promise<void> {
    await writeSession({ root: data, rows: [{ frame: 1 }, { frame: 2 }], candidate: { confirmed: true } });
    await mkdir(g("files", "games"), { recursive: true });
  }

  async function passJson(text: string): Promise<void> {
    const dir = path.join(data, "reports", "temporal-mattes", "g");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "pass.json"), text, "utf8");
  }

  test("ein unlesbares candidate.json ist keine Aufnahme ohne Zugfolge", async () => {
    await fixture();
    failOn("readFile", "candidate.json");
    await expect(chainState("g")).rejects.toThrow(/EACCES/);
  });

  test("ein unlesbares log.jsonl ist keine ungeschnittene Aufnahme", async () => {
    await fixture();
    failOn("readFile", "log.jsonl", "EMFILE");
    await expect(chainState("g")).rejects.toThrow(/EMFILE/);
  });

  test("ein I/O-Fehler am games-Verzeichnis ist kein „das Handy hat nichts aufgeschrieben\"", async () => {
    await fixture();
    failOn("readdir", "games");
    await expect(chainState("g")).rejects.toThrow(/EACCES/);
  });

  test("ein unlesbares pass.json ist kein ungelaufener Sensor", async () => {
    await fixture();
    await passJson(JSON.stringify({ _source: { log: "1:2" } }));
    failOn("readFile", "pass.json");
    await expect(chainState("g")).rejects.toThrow(/EACCES/);
  });

  test("eine halb geschriebene pass.json bleibt toleriert", async () => {
    await fixture();
    await passJson('{"_source": {"log"');
    expect((await chainState("g")).hasTemporalPass).toBe(false);
  });

  test("ein I/O-Fehler auf reference.pgn darf das Urteil des Menschen nicht ueberschreiben", async () => {
    await fixture();
    await writeFile(g("reference.pgn"), "1. e4 e5\n", "utf8");
    await writeFile(g("files", "games", "a.pgn"), "1. d4 d5\n", "utf8");
    failOn("stat", "reference.pgn");
    await expect(adoptPgn("g")).rejects.toThrow(/EACCES/);
    fail.on = null;
    expect(await readFile(g("reference.pgn"), "utf8")).toBe("1. e4 e5\n");
  });

  test("ein EACCES auf model-reads.jsonl ist kein „nie gelesen\"", async () => {
    await fixture();
    failOn("open", "model-reads.jsonl");
    await expect(chainState("g")).rejects.toThrow(/EACCES/);
  });

  test("ein EACCES auf den Stempel von log.jsonl ist kein fehlender Export", async () => {
    await writeSession({ root: data, rows: [{ frame: 1 }] });
    // Nur der Aufrufer `stampOf` in chain.ts: dieselbe Datei fragen auch andere Module.
    const caller = () => (new Error().stack ?? "").split("\n").slice(1).find((l) => !l.includes("chain.test")) ?? "";
    fail.on = (op, file) =>
      op === "stat" && file.endsWith("log.jsonl") && caller().includes("stampOf") ? "EACCES" : null;
    await expect(chainState("g")).rejects.toThrow(/EACCES/);
  });

  test("ein EACCES auf reference.pgn ist nicht „keine Referenz\"", async () => {
    await mkdir(g("files", "games"), { recursive: true });
    await writeFile(g("reference.pgn"), "1. e4 e5 *\n", "utf8");
    await writeFile(g("files", "games", "a.pgn"), "1. e4 e5 *\n", "utf8");
    failOn("readFile", "reference.pgn");
    await expect(referenceOrigin("g")).rejects.toThrow(/EACCES/);
  });

  test("ein EACCES auf files/games macht das Handy-PGN nicht zur menschlichen Referenz", async () => {
    await mkdir(g("files", "games"), { recursive: true });
    await writeFile(g("reference.pgn"), "1. e4 e5 *\n", "utf8");
    await writeFile(g("files", "games", "a.pgn"), "1. e4 e5 *\n", "utf8");
    failOn("readdir", path.join("files", "games"));
    await expect(referenceOrigin("g")).rejects.toThrow(/EACCES/);
  });
});

describe("adoptPgn", () => {
  it("copies the phone's PGN in", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    expect(await adoptPgn(NAME)).toEqual({ adopted: "2026-08-13_1941.pgn" });
    expect((await chainState(NAME)).hasReference).toBe(true);
  });

  it("never overwrites a reference somebody put there", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await writeFile(game("reference.pgn"), "1. d4 d5");
    expect(await adoptPgn(NAME)).toMatchObject({ reason: expect.stringContaining("already exists") });
  });

  // Zwischen Pruefung und Schreiben landet ein Upload: `wx` statt Ueberschreiben.
  it("a reference that lands between the check and the write is kept", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await writeFile(game("reference.pgn"), "1. d4 d5");
    failOn("stat", "reference.pgn", "ENOENT");
    expect(await adoptPgn(NAME)).toMatchObject({ reason: expect.stringContaining("appeared while adopting") });
    fail.on = null;
    expect(await readFile(game("reference.pgn"), "utf8")).toBe("1. d4 d5");
  });

  it("says plainly when the transfer carries no PGN at all", async () => {
    expect(await adoptPgn(NAME)).toMatchObject({ reason: expect.stringContaining("no .pgn") });
  });
});

describe("referenceOrigin", () => {
  it("calls an adopted reference the phone's own — the confirm screen has to say so", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    expect(await referenceOrigin(NAME)).toBe("none");
    await adoptPgn(NAME);
    expect(await referenceOrigin(NAME)).toBe("phone");
  });

  it("calls a notation that matches no bundle PGN an outside one", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await writeFile(game("reference.pgn"), "1. d4 d5");
    expect(await referenceOrigin(NAME)).toBe("outside");
  });

  it("is outside, not phone, when the bundle carries no games directory to have written it", async () => {
    await writeFile(game("reference.pgn"), "1. d4 d5");
    expect(await referenceOrigin(NAME)).toBe("outside");
  });

  // Byte-for-byte, like `realgames.reference_is_the_phones_own`: an edited copy is a human's word.
  it("stops calling it the phone's once a human has edited it", async () => {
    await mkdir(game("files", "games"), { recursive: true });
    await writeFile(game("files", "games", "2026-08-13_1941.pgn"), "1. e4 e5");
    await adoptPgn(NAME);
    await writeFile(game("reference.pgn"), "1. e4 e5 2. Nf3");
    expect(await referenceOrigin(NAME)).toBe("outside");
  });
});

describe("an interrupted recording", () => {
  it("is named before the button is offered — no moov, no ten-minute replay", async () => {
    const dir = game("files", "sessions", "20260813-121218");
    await mkdir(dir, { recursive: true });
    // `ftyp` then a 64-bit `mdat` that runs to the end: what a killed recorder leaves behind.
    const head = Buffer.alloc(32);
    head.writeUInt32BE(16, 0);
    head.write("ftyp", 4);
    head.writeUInt32BE(1, 16);
    head.write("mdat", 20);
    head.writeBigUInt64BE(BigInt(16), 24);
    await writeFile(path.join(dir, "video.mp4"), head);

    const state = await chainState(NAME);
    expect(state.video).toContain("video.mp4");
    expect(state.videoBroken).toContain("moov");
  });

  it("says nothing about a finalized one", async () => {
    const dir = game("files", "sessions", "20260813-193423");
    await mkdir(dir, { recursive: true });
    const head = Buffer.alloc(24);
    head.writeUInt32BE(16, 0);
    head.write("ftyp", 4);
    head.writeUInt32BE(8, 16);
    head.write("moov", 20);
    await writeFile(path.join(dir, "video.mp4"), head);

    expect((await chainState(NAME)).videoBroken).toBeNull();
  });

  // Eine Aufnahme sind bis zu elf Dateien (`video-NNN.mp4`), und der Export endet an jedem fehlenden `moov`.
  const mp4 = (finalized: boolean) => {
    const box = (type: string, payload = 0) => {
      const b = Buffer.alloc(8 + payload);
      b.writeUInt32BE(8 + payload, 0);
      b.write(type, 4, "latin1");
      return b;
    };
    return Buffer.concat([box("ftyp", 8), box("mdat", 32), ...(finalized ? [box("moov", 8)] : [])]);
  };

  async function parts(...finalized: boolean[]) {
    const dir = game("files", "sessions", "20260915-165444");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "video.mp4"), mp4(finalized[0]));
    for (let i = 1; i < finalized.length; i++) {
      await writeFile(path.join(dir, `video-${String(i).padStart(3, "0")}.mp4`), mp4(finalized[i]));
    }
  }

  it("ein Teil in der Mitte ohne Index macht die Aufnahme kaputt, nicht nur der Kopf", async () => {
    await parts(true, true, false, true);
    const state = await chainState(NAME);
    expect(state.videoBroken).not.toBeNull();
    expect(state.videoBroken).toMatch(/video-002/);
  });

  it("alle Teile vollstaendig heisst vollstaendig", async () => {
    await parts(true, true, true);
    expect((await chainState(NAME)).videoBroken).toBeNull();
  });
});

// Ohne `step` stand die Zeichenkette "undefined" in der 409-Meldung, die ein Mensch liest.
test("a body without a step is a bad request, not a conflict about \"undefined\"", async () => {
  await mkdir(path.join(data, "recordings", "g"), { recursive: true });
  const { POST } = await import("@/app/api/chain/[name]/route");
  const answer = await POST(new Request("http://local/api/chain/g", { method: "POST", body: JSON.stringify({}) }),
                            { params: Promise.resolve({ name: "g" }) });
  const { error } = (await answer.json()) as { error: string };
  expect(answer.status).toBe(400);
  expect(error, "BUG: die Zeichenkette \"undefined\" steht in der Meldung").not.toMatch(/undefined/);
  expect(error).toMatch(/step/);
});
