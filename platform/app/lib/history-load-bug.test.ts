import { beforeEach, expect, test, vi } from "vitest";
import type { LedgerChange } from "@/lib/corrections";

const games = vi.hoisted(() => ({ names: [] as string[] }));
const ledger = vi.hoisted(() => ({ rows: [] as LedgerChange[] }));
const session = vi.hoisted(() => ({ rows: [] as { stem: string; fen: string }[] }));

vi.mock("@/lib/label-stream", () => ({ liveGames: async () => games.names }));
vi.mock("@/lib/corrections", () => ({
  ledgerChanges: async (_name: string, l: string) => ledger.rows.filter((r) => r.ledger === l),
}));
vi.mock("@/lib/session", () => ({ loadSession: async () => ({ rows: session.rows }) }));

const { loadHistory } = await import("@/lib/history-load");

const change = (over: Partial<LedgerChange>): LedgerChange => ({
  session_id: "rg-g", frame: "000100", square: "e5", label: "bB", before: null,
  retract: false, ledger: "corrections", ts: "2026-09-01T00:00:00+00:00", seq: 0, ...over,
});

beforeEach(() => {
  games.names = ["g"];
  session.rows = [{ stem: "000100", fen: "8/8/8/4p3/8/8/8/8 w - - 0 1" }];
});

test("a ledger row whose frame vanished from the log does not eat a history slot", () => {
  // Die zwei juengsten Zeilen nennen Frames, die der Re-Export nicht mehr schreibt. Die aeltere
  // Zeile zeigt auf ein lebendes Frame und gehoert in die Historie — `slice(0, limit)` laeuft
  // aber VOR dem Filter, also bleibt die Lane leer.
  ledger.rows = [
    change({ frame: "999998", ts: "2026-09-03T00:00:00+00:00", seq: 2 }),
    change({ frame: "999999", ts: "2026-09-02T00:00:00+00:00", seq: 1 }),
    change({ frame: "000100", ts: "2026-09-01T00:00:00+00:00", seq: 0 }),
  ];
  return loadHistory(2).then((out) => {
    expect(out.map((c) => c.frame)).toEqual(["000100"]);
  });
});
