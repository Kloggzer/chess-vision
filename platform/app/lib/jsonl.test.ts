import { expect, test } from "vitest";
import { jsonlRows, readJsonl } from "@/lib/jsonl";

test("eine halb geschriebene letzte Zeile ist keine Zeile", () => {
  const rows = jsonlRows('{"a":1}\n{"b":2}\n{"c":');
  expect(rows).toEqual([{ a: 1 }, { b: 2 }]);
});

test("Leerzeilen und CRLF zaehlen nicht mit", () => {
  expect(jsonlRows('\r\n{"a":1}\r\n\r\n')).toEqual([{ a: 1 }]);
});

test("nur Objekte — eine nackte Zahl oder Liste ist keine Zeile", () => {
  expect(jsonlRows('7\n[1,2]\n{"a":1}\nnull')).toEqual([{ a: 1 }]);
});

test("die letzte halbe Zeile ist ein laufender Schreiber, keine Beschaedigung", () => {
  const got = readJsonl('{"a":1}\n{"b":');

  expect(got.rows).toEqual([{ a: 1 }]);
  expect([got.tail, got.corrupt]).toEqual([true, 0]);
});

test("eine kaputte Zeile MITTEN drin kann kein Schreiber erklaeren", () => {
  const got = readJsonl('{"a":1}\n{"kaputt\n{"b":2}');

  expect(got.rows).toEqual([{ a: 1 }, { b: 2 }]);
  expect([got.tail, got.corrupt]).toEqual([false, 1]);
});

test("eine kaputte Zeile MIT Zeilenumbruch ist kein laufender Schreiber", () => {
  // Der Umbruch beweist, dass der Schreiber fertig war — also ist die Zeile beschaedigt.
  // Gefunden von `route-audit-bugs.test.ts`, das genau diesen Fall als Fehler verlangt.
  const got = readJsonl('{"a":1}\n{"b":\n');

  expect([got.tail, got.corrupt]).toEqual([false, 1]);
});
