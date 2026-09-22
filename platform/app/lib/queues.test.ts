import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import type { ChainState } from "@/lib/chain";
import { isBare, queueRows, splitQueues, type QueueRow } from "@/lib/queues";
import { setUseless } from "@/lib/useless";
import { tempDataRoot } from "@/lib/test-fixtures";

const CHAIN: ChainState = {
  step: "label",
  video: null,
  videoBroken: null,
  offeredPgn: null,
  hasReference: false,
  hasPhoneRecord: false,
  hasCandidate: false,
  confirmed: false,
  hasSession: false,
  mattes: { done: 0, total: 0, target: 0 , reported: 0, reportedOpen: 0, reportedOrphan: 0, wanted: 0 },
  hasSettle: true,
  outdated: {},
  reason: "",
  hasTemporalPass: false,
  hasModelReads: false,
  useless: null,
};

const row = (name: string, chain: Partial<ChainState> = {}, patch: Partial<QueueRow> = {}): QueueRow => ({
  name,
  title: null,
  plies: 0,
  frames: 0,
  archived: false,
  chain: { ...CHAIN, ...chain },
  ...patch,
});

const FLAG = { at: "2026-08-14T20:00:00Z" };

describe("splitQueues", () => {
  const rows = [
    row("2026-08-12-01-18-44", { step: "confirm", hasCandidate: true, hasReference: true }, { plies: 41 }),
    row("2026-08-14-09-23-19", { step: "confirm", hasCandidate: true }, { plies: 12 }),
    row("2026-08-13-01-31-43", { step: "labeln", hasCandidate: true }),
    row("2026-08-13-12-12-18", { step: "label", video: "v.mp4" }),
    row("2026-08-08-11-55-19", { step: "label" }),
    row("2026-08-11-23-55-04", { step: "export", hasCandidate: true }),
  ];

  it("sorts each queue newest first — the directory name IS the recording's clock", () => {
    expect(splitQueues(rows).confirm.map((r) => r.name)).toEqual([
      "2026-08-14-09-23-19",
      "2026-08-12-01-18-44",
    ]);
  });

  it("reads both naming schemes as the same clock — a `VID_` name is not the newest by its V", () => {
    const mixed = [
      row("VID_20260802_222741", { step: "labeln", hasCandidate: true }),
      row("2026-08-13-19-34-23", { step: "labeln", hasCandidate: true }),
      row("VID_20260726_233432", { step: "labeln", hasCandidate: true }),
    ];
    expect(splitQueues(mixed).labeln.map((r) => r.name)).toEqual([
      "2026-08-13-19-34-23",
      "VID_20260802_222741",
      "VID_20260726_233432",
    ]);
  });

  it("puts every game in exactly the queue of its own next step", () => {
    const { confirm, labeln, blocked, bare } = splitQueues(rows);
    expect(confirm).toHaveLength(2);
    expect(labeln.map((r) => r.name)).toEqual(["2026-08-13-01-31-43"]);
    // A video without a candidate is the machine step nobody ran — shown, but not as reviewable.
    expect(blocked.map((r) => r.name)).toEqual(["2026-08-13-12-12-18"]);
    expect(bare.map((r) => r.name)).toEqual(["2026-08-08-11-55-19"]);
  });

  it("drops useless and archived games out of every queue, bare count included", () => {
    const flagged = [
      row("2026-08-14-09-23-19", { step: null, hasCandidate: true, useless: FLAG }),
      row("2026-08-13-01-31-43", { step: "labeln" }, { archived: true }),
      row("2026-08-08-11-55-19", { step: null, useless: FLAG }),
    ];
    expect(splitQueues(flagged)).toEqual({ confirm: [], labeln: [], blocked: [], bare: [] });
  });

  it("a phone-record bundle is blocked like a label one", () => {
    const record = { step: "phone-record" as const, hasPhoneRecord: true };
    expect(splitQueues([row("2026-08-30-16-20-19", { ...record, video: "v.mp4" })]).blocked).toHaveLength(1);
    // No video: the verb has nothing to place the plies on, so the bundle is bare, not blocked.
    expect(isBare(row("2026-08-13-01-01-25", record))).toBe(true);
  });

  it("counts a broken recording as blocked, not as bare — the bundle still holds a video", () => {
    const broken = row("2026-08-13-12-12-18", { step: "label", video: "v.mp4", videoBroken: "no moov" });
    expect(isBare(broken)).toBe(false);
    expect(splitQueues([broken]).blocked).toHaveLength(1);
  });
});

describe("queueRows", () => {
  let data: string;

  beforeEach(async () => {
    data = await tempDataRoot("queues");
  });

  const game = (name: string, ...parts: string[]) => path.join(data, "recordings", name, ...parts);

  it("reads the whole recordings dir into rows the pages can split", async () => {
    await mkdir(game("2026-08-08-11-55-19", "review"), { recursive: true });
    // Ein echtes Bild: `listFrameStems` liest die Groesse seit 2026-09-23 und raet sie nicht mehr.
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#000" } }).png().toBuffer();
    await writeFile(game("2026-08-08-11-55-19", "review", "000133.png"), png);
    await writeFile(game("2026-08-08-11-55-19", "reference.pgn"), "1. e4 e5");

    await mkdir(game("2026-08-14-09-23-19"), { recursive: true });
    await writeFile(
      game("2026-08-14-09-23-19", "candidate.json"),
      JSON.stringify({ moves: [{ ply: 1, san: "e4", frame: 1 }], confirmed: false }),
    );

    const { confirm, bare } = splitQueues(await queueRows());
    expect(confirm.map((r) => [r.name, r.plies])).toEqual([["2026-08-14-09-23-19", 1]]);
    expect(bare.map((r) => [r.name, r.frames, r.chain.hasReference])).toEqual([
      ["2026-08-08-11-55-19", 1, true],
    ]);
    // Counted only where it decides something: a bundle with a candidate never pays the readdir.
    expect(confirm[0].frames).toBe(0);
  });

  it("lets the nutzlos flag empty the queues without touching any other file", async () => {
    await mkdir(game("2026-08-14-09-23-19"), { recursive: true });
    await writeFile(game("2026-08-14-09-23-19", "candidate.json"), JSON.stringify({ moves: [], confirmed: false }));
    expect(splitQueues(await queueRows()).confirm).toHaveLength(1);

    await setUseless("2026-08-14-09-23-19", true, "Brett halb aus dem Bild");
    const after = await queueRows();
    expect(splitQueues(after).confirm).toEqual([]);
    expect(after[0].chain.useless).toMatchObject({ reason: "Brett halb aus dem Bild" });
    expect(after[0].chain.step).toBeNull();
  });
});
