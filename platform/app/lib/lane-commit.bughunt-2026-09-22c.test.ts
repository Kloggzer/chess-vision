/**
 * H1: `CellLane.accept` startete `onDirtyCells`/`onUnusable` als `void` und wartete nur auf
 * `onFlush`. Gingen die Korrekturzeilen durch und der Zettel nicht, schloss die Korrektur die
 * Karten — das UNABHAENGIGE Urteil („neu messen", „kein Label zu holen") war weg, mit Meldung.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { pageWritten, type PageWriter } from "@/lib/lane-commit";

const ROOT = path.join(__dirname, "..");
const read = (rel: string) => readFile(path.join(ROOT, rel), "utf8");

const ok: PageWriter = () => Promise.resolve(true);

test("ein einziger fehlgeschlagener Schreiber haelt die Seite offen", async () => {
  expect(await pageWritten([ok, () => Promise.resolve(false), ok])).toBe(false);
  expect(await pageWritten([ok, ok, ok])).toBe(true);
});

test("ein `void`-Schreiber ist keine Bestaetigung, und ein Wurf auch nicht", async () => {
  const fireAndForget = (() => undefined) as unknown as PageWriter;
  expect(await pageWritten([ok, fireAndForget])).toBe(false);
  expect(await pageWritten([ok, () => Promise.reject(new Error("EMFILE"))])).toBe(false);
});

test("und sie laufen ZUGLEICH — die Lane wartet auf den langsamsten, nicht auf die Summe", async () => {
  const started: number[] = [];
  const late = (i: number): PageWriter => () => {
    started.push(i);
    return new Promise((resolve) => setTimeout(() => resolve(true), 20));
  };
  const begin = Date.now();
  expect(await pageWritten([late(0), late(1), late(2)])).toBe(true);
  expect(started).toEqual([0, 1, 2]);
  expect(Date.now() - begin).toBeLessThan(55);
});

test("die Zell-Lane raeumt die Seite nur hinter diesem einen Riegel", async () => {
  const lane = await read("app/strom/labeln/cell-lane.tsx");
  expect(lane, "alle drei Schreiber gehen durch `pageWritten`").toMatch(/pageWritten\(\[/);
  expect(lane, "keiner wird mehr unbeachtet gestartet").not.toMatch(/^\s*(if \(.*\) )?on(DirtyCells|Unusable)\(/m);
  const guard = lane.slice(lane.indexOf("pageWritten(["));
  expect(guard.indexOf("onDirtyCells("), "der Dirty-Zettel haengt am Riegel").toBeGreaterThan(-1);
  expect(guard.indexOf("onUnusable("), "das Unbrauchbar-Ledger auch").toBeGreaterThan(-1);
  expect(guard.slice(0, guard.indexOf("setSkipped"))).toMatch(/if \(!written\) return;/);
});

test("und der Strom sagt beiden Schreibern an, ob geschrieben wurde", async () => {
  const stream = await read("app/strom/labeln/stream.tsx");
  expect(stream, "kein `void` mehr auf dem Unbrauchbar-Weg").not.toMatch(/void ruleCells\(/);
  expect(stream, "`ruleCells` antwortet").toMatch(/ruleCells = useCallback\(\s*async \(marked: LaneCell\[\]\): Promise<boolean>/);
  expect(stream, "`markDirty` antwortet").toMatch(/reason: string\): Promise<boolean>/);
});
