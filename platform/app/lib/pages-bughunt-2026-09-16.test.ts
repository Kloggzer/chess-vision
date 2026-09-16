import { expect, test } from "vitest";
import { barPct } from "@/lib/chart";
import { clampPage, turnPage } from "@/lib/page-turn";
import { pageAllMarked, toggleAllOnPage } from "@/lib/matte-select";
import { cursorSession, linkFilter } from "@/lib/stream-head";

/**
 * Funde in `app/**` — der Ort, den `vitest.config.mts` nicht einsammelt. Jede Stelle steckt
 * deshalb in einer reinen Funktion in `lib/`, die die Seite aufruft.
 */

// ---- 1. `alle` in der Matte-Lane nahm die Marken der anderen Seiten mit ------------------------

test("alle markiert nur die eigene Seite und laesst die anderen stehen", () => {
  const seite1 = new Set(["a|000100", "a|000200"]);
  const seite2 = ["a|000300", "a|000400"];

  const next = toggleAllOnPage(seite2, seite1, new Set<string>());

  expect([...next].sort()).toEqual(["a|000100", "a|000200", "a|000300", "a|000400"]);
});

test("eine vorgemerkt leere Karte blockiert das Abraeumen nicht", () => {
  const seite = ["a|000100", "a|000200"];
  const clean = new Set(["a|000200"]);
  const marked = toggleAllOnPage(seite, new Set<string>(), clean);

  expect([...marked], "die leere bleibt unmarkiert").toEqual(["a|000100"]);
  expect(pageAllMarked(seite, marked, clean), "die Seite ist damit voll").toBe(true);
  expect([...toggleAllOnPage(seite, marked, clean)], "zweiter Druck raeumt ab").toEqual([]);
});

// ---- 2. Seitenwechsel im Zell-Raster liess die Auswahl der ALTEN Seite stehen ------------------

test("ein Seitenwechsel verwirft die nach Seiten-Index gekeyte Auswahl", () => {
  const next = turnPage({ page: 0, picks: { 0: "wK", 3: "empty" }, cursor: 3 }, 1, 4);

  expect(next.page).toBe(1);
  expect(next.picks, "sonst faerbt Seite 1 die Zellen von Seite 2").toEqual({});
  expect(next.cursor).toBe(0);
});

test("der Seitenindex laeuft nicht ueber das Ende hinaus", () => {
  expect(clampPage(2, 1, 3), "letzte Seite bleibt letzte Seite").toBe(2);
  expect(clampPage(0, -1, 3)).toBe(0);
  expect(clampPage(0, 1, 0), "ohne Seiten gibt es nur die Null").toBe(0);
});

// ---- 3. Der Kopf des Stroms nannte ohne Zeiger die ERSTE Aufnahme ------------------------------

test("ohne Zeiger nennt der Kopf keine Aufnahme", () => {
  const sessions = [{ sessionId: "rg-a" }, { sessionId: "rg-b" }];

  expect(cursorSession(sessions, { session: 1 })).toEqual({ sessionId: "rg-b" });
  expect(cursorSession(sessions, undefined), "nicht rg-a").toBeUndefined();
});

// ---- 4. Ein geteilter Link ohne `min` fragte mit der Schwelle 0 ------------------------------

test("ein Link ohne `min` stellt keine Frage, statt jede Zelle durchzulassen", () => {
  expect(linkFilter("?class=wK&min=0.5&phase=after")).toEqual({
    filter: { klass: "wK", min: 0.5 },
    phase: "after",
  });
  expect(linkFilter("?class=wK"), "Number(null) waere 0").toBeNull();
  expect(linkFilter("?class=wK&min="), 'Number("") waere 0').toBeNull();
  expect(linkFilter("?min=0.5"), "ohne Klasse keine Frage").toBeNull();
  expect(linkFilter("?class=wK&min=abc")).toBeNull();
});

// ---- 5. Gepinnt: der Veto-Balken zeichnet „nicht gemessen" als gemessene Null ------------------

/**
 * `app/corpus/sections.tsx:585` sizes the bar with `run.phantoms ?? 0` while its own text says
 * `—`. `lib/chart.ts:maxOf` promises the opposite ("Nulls are dropped, never read as 0"), and
 * null Phantome ist in diesem Projekt das BESTE Ergebnis, nicht das fehlende. Ein Fix ist eine
 * Entscheidung ueber das Aussehen (eigene Schraffur oder gar kein Balken) — die trifft der Nutzer.
 */
test.fails("ein ungemessener Phantom-Wert darf nicht wie eine gemessene Null aussehen", () => {
  const unmeasured: number | null = null;
  expect(barPct(unmeasured ?? 0, 100)).not.toBe(barPct(0, 100));
});
