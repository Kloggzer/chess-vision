import { beforeEach, expect, test, vi } from "vitest";
import type { LedgerChange } from "@/lib/corrections";

const games = vi.hoisted(() => ({ names: [] as string[] }));
const ledgers = vi.hoisted(() => ({ rows: {} as Record<string, LedgerChange[]> }));

vi.mock("@/lib/label-stream", () => ({ liveGames: async () => games.names }));
vi.mock("@/lib/corrections", () => ({
  ledgerChanges: async (name: string, l: string) => (ledgers.rows[name] ?? []).filter((r) => r.ledger === l),
}));
vi.mock("@/lib/session", () => ({
  loadSession: async () => ({ rows: [{ stem: "000100", fen: "8/8/8/4p3/8/8/8/8 w - - 0 1" }] }),
}));

const { loadHistory } = await import("@/lib/history-load");

const change = (over: Partial<LedgerChange>): LedgerChange => ({
  session_id: "rg-g", frame: "000100", square: "e5", label: "bB", before: null,
  retract: false, ledger: "corrections", ts: "2026-09-01T00:00:00+00:00", seq: 0, ...over,
});

beforeEach(() => {
  // `liveGames` ordnet nach AUFNAHMEDATUM, nicht danach, wann jemand gelabelt hat.
  games.names = ["neue-aufnahme", "alte-aufnahme"];
});

test("eine spaeter gelabelte AELTERE Aufnahme faellt nicht aus der Historie", () => {
  ledgers.rows = {
    "neue-aufnahme": Array.from({ length: 8 }, (_, i) =>
      change({ seq: i, ts: `2026-09-0${1 + (i % 3)}T00:00:00+00:00` })),
    "alte-aufnahme": [change({ session_id: "rg-alt", ts: "2026-09-20T00:00:00+00:00", seq: 0 })],
  };
  return loadHistory(2).then((out) => {
    expect(out[0]?.sessionId).toBe("rg-alt");
  });
});
