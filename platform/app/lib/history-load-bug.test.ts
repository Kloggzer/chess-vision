import { beforeEach, expect, test, vi } from "vitest";
import type { LedgerChange } from "@/lib/session-store/corrections";

const games = vi.hoisted(() => ({ names: [] as string[] }));
const ledgers = vi.hoisted(() => ({ rows: {} as Record<string, LedgerChange[]> }));

vi.mock("@/lib/label/label-stream", () => ({ liveGames: async () => games.names }));
vi.mock("@/lib/session-store/corrections", () => ({
  ledgerChanges: async (name: string, l: string) => (ledgers.rows[name] ?? []).filter((r) => r.ledger === l),
}));
vi.mock("@/lib/session-store/session", () => ({
  loadSession: async () => ({ rows: [{ stem: "000100", fen: "8/8/8/4p3/8/8/8/8 w - - 0 1" }] }),
}));

const { loadHistory } = await import("@/lib/label/history-load");

const change = (over: Partial<LedgerChange>): LedgerChange => ({
  session_id: "rg-g", frame: "000100", square: "e5", label: "bB", before: null,
  retract: false, ledger: "corrections", ts: "2026-09-01T00:00:00+00:00", seq: 0, ...over,
});

beforeEach(() => {
  games.names = ["g"];
  ledgers.rows = {};
});

test("a ledger row whose frame vanished from the log does not eat a history slot", async () => {
  // Die zwei juengsten Zeilen nennen Frames, die der Re-Export nicht mehr schreibt; geschnitten wurde VOR dem Filter.
  ledgers.rows.g = [
    change({ frame: "999998", ts: "2026-09-03T00:00:00+00:00", seq: 2 }),
    change({ frame: "999999", ts: "2026-09-02T00:00:00+00:00", seq: 1 }),
    change({ frame: "000100", ts: "2026-09-01T00:00:00+00:00", seq: 0 }),
  ];
  expect((await loadHistory(2)).map((c) => c.frame)).toEqual(["000100"]);
});

test("eine spaeter gelabelte AELTERE Aufnahme faellt nicht aus der Historie", async () => {
  // `liveGames` ordnet nach AUFNAHMEDATUM, nicht danach, wann jemand gelabelt hat.
  games.names = ["neue-aufnahme", "alte-aufnahme"];
  ledgers.rows = {
    "neue-aufnahme": Array.from({ length: 8 }, (_, i) =>
      change({ seq: i, ts: `2026-09-0${1 + (i % 3)}T00:00:00+00:00` })),
    "alte-aufnahme": [change({ session_id: "rg-alt", ts: "2026-09-20T00:00:00+00:00", seq: 0 })],
  };
  expect((await loadHistory(2))[0]?.sessionId).toBe("rg-alt");
});
