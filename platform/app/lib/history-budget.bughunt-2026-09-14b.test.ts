import { beforeEach, expect, test, vi } from "vitest";
import type { LedgerChange } from "@/lib/corrections";

/**
 * `loadHistory` sammelt ueber ALLE Aufnahmen in EINEN Topf und bricht die innere Schleife bei
 * `out.length >= limit` ab. Die erste Aufnahme fuellt das Budget, jede weitere traegt nichts bei —
 * auch wenn ihre Zeilen die juengsten des Korpus sind.
 */
const games = vi.hoisted(() => ({ names: [] as string[] }));
const ledger = vi.hoisted(() => ({ byGame: new Map<string, LedgerChange[]>() }));
const session = vi.hoisted(() => ({ rows: [] as { stem: string; fen: string }[] }));

vi.mock("@/lib/label-stream", () => ({ liveGames: async () => games.names }));
vi.mock("@/lib/corrections", () => ({
  ledgerChanges: async (name: string, l: string) =>
    (ledger.byGame.get(name) ?? []).filter((r) => r.ledger === l),
}));
vi.mock("@/lib/session", () => ({ loadSession: async () => ({ rows: session.rows }) }));

const { loadHistory } = await import("@/lib/history-load");

const change = (over: Partial<LedgerChange>): LedgerChange => ({
  session_id: "rg-g", frame: "000100", square: "e5", label: "bB", before: null,
  retract: false, ledger: "corrections", ts: "2026-09-01T00:00:00+00:00", seq: 0, ...over,
});

beforeEach(() => {
  // `liveGames` liefert die JUENGSTE Aufnahme zuerst — die zuletzt beurteilte ist eine andere.
  games.names = ["neu", "alt"];
  session.rows = [{ stem: "000100", fen: "8/8/8/4p3/8/8/8/8 w - - 0 1" }];
  ledger.byGame = new Map([
    ["neu", [
      change({ session_id: "rg-neu", square: "a1", ts: "2026-09-01T00:00:00+00:00", seq: 1 }),
      change({ session_id: "rg-neu", square: "a2", ts: "2026-09-01T00:00:00+00:00", seq: 0 }),
    ]],
    ["alt", [change({ session_id: "rg-alt", square: "h8", ts: "2026-09-14T12:00:00+00:00", seq: 0 })]],
  ]);
});

test("die zuletzt geschriebene Zeile des Korpus steht in der Historie, egal aus welcher Aufnahme", async () => {
  const out = await loadHistory(2);
  expect(out.map((c) => `${c.sessionId}|${c.square}`)).toContain("rg-alt|h8");
});

test("die Historie ist ueber den Korpus sortiert, nicht je Aufnahme abgeschnitten", async () => {
  const out = await loadHistory(2);
  expect(out[0].ts).toBe("2026-09-14T12:00:00+00:00");
});
