// Ein stilles `catch` macht aus dem Urteil eines Menschen ein "gab es nie"; der Schwanz: `pool.test.ts`.
import { expect, test } from "vitest";
import { dedupCorrections } from "@/lib/corpus/pool";
import { readJsonl } from "@/lib/jsonl";

test("eine kaputte Zeile mittendrin verschwindet nicht stillschweigend", () => {
  const A = '{"session_id":"rg-a","frame":"000001","square":"a1","label":"wP"}';
  const B = '{"session_id":"rg-a","frame":"000002","square":"b2","label":"wQ"}';
  expect(() => dedupCorrections(readJsonl(`${A}\n{"session_id":"rg-a","fra\n${B}\n`))).toThrow();
});
