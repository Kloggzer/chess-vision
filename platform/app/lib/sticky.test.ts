import { expect, test } from "vitest";
import { readSticky } from "@/lib/sticky";

type View = { mode: string; boost: boolean; loupe: boolean };
const FALLBACK: View = { mode: "fade", boost: false, loupe: true };

/** 5 — ein `JSON.parse` im Render. `useSticky` las den Wert roh; ein halber oder fremder Eintrag
 *  warf, und die Confirm-Seite blieb weiss, bis jemand `localStorage` von Hand leert. */
test("ein unlesbarer Eintrag ist die Vorgabe, kein Wurf", () => {
  expect(readSticky('{"mode":"fade","bo', FALLBACK)).toEqual(FALLBACK);
  expect(readSticky("fade", FALLBACK)).toEqual(FALLBACK);
  expect(readSticky(null, FALLBACK)).toEqual(FALLBACK);
  expect(readSticky("", FALLBACK)).toEqual(FALLBACK);
});

/** Ein Skalar ist kein Zustand: `"null"` und `"3"` parsen sauber und liessen `view.mode`
 *  undefiniert durch, ohne dass irgendwo etwas auffiel. */
test("nur ein Objekt ist eine Einstellung", () => {
  expect(readSticky("null", FALLBACK)).toEqual(FALLBACK);
  expect(readSticky("3", FALLBACK)).toEqual(FALLBACK);
  expect(readSticky('{"mode":"diff","boost":true,"loupe":false}', FALLBACK)).toEqual({
    mode: "diff", boost: true, loupe: false,
  });
});

/**
 * 4 — "nicht gespeichert" als gespeicherter Wert. Ein Eintrag aus einer Fassung, die `loupe` noch
 * nicht kannte, liefert `undefined` — und `undefined` ist im UI AUS, obwohl die Vorgabe AN ist.
 * Das Gegenmittel waere ein Merge mit `fallback`; es aendert aber, was der Nutzer sieht, und das
 * ist seine Entscheidung, nicht meine.
 */
test.fails("ein fehlender Schluessel faellt auf die Vorgabe, nicht auf `undefined`", () => {
  expect(readSticky<View>('{"mode":"diff"}', FALLBACK).loupe).toBe(true);
});
