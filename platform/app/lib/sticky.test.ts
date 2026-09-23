import { expect, test } from "vitest";
import { readSticky } from "@/lib/sticky";

type View = { mode: string; boost: boolean; loupe: boolean };
const FALLBACK: View = { mode: "fade", boost: false, loupe: true };

/** Ein halber Eintrag warf im Render, und die Confirm-Seite blieb weiss. */
test("ein unlesbarer Eintrag ist die Vorgabe, kein Wurf", () => {
  expect(readSticky('{"mode":"fade","bo', FALLBACK)).toEqual(FALLBACK);
  expect(readSticky("fade", FALLBACK)).toEqual(FALLBACK);
  expect(readSticky(null, FALLBACK)).toEqual(FALLBACK);
  expect(readSticky("", FALLBACK)).toEqual(FALLBACK);
});

/** `"null"` und `"3"` parsen sauber und liessen `view.mode` undefiniert durch. */
test("nur ein Objekt ist eine Einstellung", () => {
  expect(readSticky("null", FALLBACK)).toEqual(FALLBACK);
  expect(readSticky("3", FALLBACK)).toEqual(FALLBACK);
  expect(readSticky('{"mode":"diff","boost":true,"loupe":false}', FALLBACK)).toEqual({
    mode: "diff", boost: true, loupe: false,
  });
});

/** Offen: ein alter Eintrag ohne `loupe` liest sich AUS; der Merge mit `fallback` ist Nutzerentscheidung. */
test.fails("ein fehlender Schluessel faellt auf die Vorgabe, nicht auf `undefined`", () => {
  expect(readSticky<View>('{"mode":"diff"}', FALLBACK).loupe).toBe(true);
});
