import { expect, test } from "vitest";
import { jsonlRows } from "@/lib/jsonl";

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
