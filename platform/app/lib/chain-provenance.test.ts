/**
 * Die Kette prueft Herkunft, nicht Existenz — und kennt `settle-scan` als eigene Sprosse.
 *
 * Ein Reads-Lauf von VOR dem letzten Export haelt die Sprosse sonst genauso geschlossen wie ein
 * frischer (derselbe Riss wie bei der driftenden `coverage`), und eine vergessene `settle-scan`
 * meldet sich nicht, sondern zeigt eine leere Strittig-Lane.
 */
import { mkdir, mkdtemp, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { chainState, nextStep } from "@/lib/chain";

let data: string;
const NAME = "2026-08-13-12-10-55";

beforeEach(async () => {
  data = await mkdtemp(path.join(tmpdir(), "chesslab-prov-"));
  process.env.CHESSLAB_DATA_DIR = data;
  delete process.env.CHESSLAB_MODEL_READ_RUN;
  await mkdir(path.join(data, "recordings", NAME), { recursive: true });
});

const game = (...parts: string[]) => path.join(data, "recordings", NAME, ...parts);

async function exported(settled = true): Promise<void> {
  await mkdir(game("files", "sessions", "20260813-121055"), { recursive: true });
  await writeFile(game("files", "sessions", "20260813-121055", "video.mp4"), "x");
  await writeFile(game("candidate.json"), JSON.stringify({ moves: [], confirmed: true }));
  // Fuenf Bretter auf einem Ply: erst ab `SETTLE_MIN_FRAMES` hat der Scan ueberhaupt etwas zu messen.
  const rows = [1, 2, 3, 4, 5].map((i) => JSON.stringify({
    frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1,
    ...(settled ? { settle_dev: [1.0, 2.0] } : {}),
  }));
  await writeFile(game("log.jsonl"), rows.join("\n") + "\n");
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

/** Der Stempel, den Python schreibt: Mtime in ganzen Millisekunden und Groesse der `log.jsonl`. */
async function logStamp(): Promise<string> {
  const { stat } = await import("node:fs/promises");
  const s = await stat(game("log.jsonl"));
  return `${Math.floor(s.mtimeMs)}:${s.size}`;
}

describe("settle-scan als Sprosse", () => {
  it("steht zwischen Export und Matten, wenn keine Zeile settle_dev traegt", async () => {
    await exported(false);
    expect((await chainState(NAME)).step).toBe("settle-scan");
  });

  // Sonst haengt jede winzige Aufnahme fuer immer auf einem Knopf, der nichts zu messen hat.
  it("steht nicht an, wo kein Intervall lang genug zum Messen ist", async () => {
    await exported(false);
    const rows = [0, 1, 2, 3].map((i) => JSON.stringify({ frame: `${i}.png`, board: `boards/${i}.webp`, ply: 1 }));
    await writeFile(game("log.jsonl"), rows.join("\n") + "\n");
    expect((await chainState(NAME)).step).not.toBe("settle-scan");
  });

  it("ist durch, sobald eine Zeile gemessen ist", async () => {
    await exported(true);
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

  it("nennt einen Reads-Lauf eines ANDEREN Modells veraltet", async () => {
    await exported();
    await pass({ log: await logStamp() });
    await reads({ log: await logStamp(), model: "p4-128" });
    process.env.CHESSLAB_MODEL_READ_RUN = "runs/p4a-80-clahe";
    const state = await chainState(NAME);
    expect(state.step).toBe("model-read");
    expect(state.reason).toMatch(/p4-128/);
  });
});

describe("nextStep sagt auch warum", () => {
  const base = {
    video: "v",
    videoBroken: null,
    offeredPgn: null,
    hasReference: false,
    hasPhoneRecord: false,
    hasCandidate: false,
    confirmed: false,
    hasSession: false,
    hasSettle: false,
    mattes: { done: 0, total: 0, target: 0, reported: 0, reportedOpen: 0 },
    hasTemporalPass: false,
    hasModelReads: false,
    outdated: {},
    useless: null,
  };

  it("begruendet jeden Schritt in einem Satz", () => {
    expect(nextStep(base)).toEqual({ step: "label", reason: expect.stringMatching(/\S/) });
    expect(nextStep({ ...base, useless: { at: "2026-08-14T20:00:00Z" } }))
      .toEqual({ step: null, reason: expect.stringContaining("nutzlos") });
    const done = { ...base, hasCandidate: true, confirmed: true, hasSession: true, hasSettle: true,
      hasTemporalPass: true, hasModelReads: true };
    expect(nextStep(done)).toEqual({ step: "labeln", reason: expect.stringMatching(/\S/) });
  });
});
