/**
 * Eine kaputte Zeile MITTENDRIN ist kein laufender Schreiber, sondern Beschaedigung — und ein
 * stilles `catch` daraus macht aus dem Urteil eines Menschen ein "gab es nie". Genau die Form,
 * die dieses Projekt schon neunzehnmal getroffen hat: nicht gemessen, gelesen als Normalwert.
 */
import { expect, test } from "vitest";
import { dedupCorrections } from "@/lib/pool";
import { readJsonl } from "@/lib/jsonl";

const A = '{"session_id":"rg-a","frame":"000001","square":"a1","label":"wP"}';
const B = '{"session_id":"rg-a","frame":"000002","square":"b2","label":"wQ"}';

test("eine kaputte Zeile mittendrin verschwindet nicht stillschweigend", () => {
  const text = `${A}\n{"session_id":"rg-a","fra\n${B}\n`;

  expect(() => dedupCorrections(readJsonl(text))).toThrow();
});

test("der Schwanz bleibt geduldet — dort schreibt gerade jemand", () => {
  const text = `${A}\n{"session_id":"rg-a","fra`;

  expect(dedupCorrections(readJsonl(text)).size).toBe(1);
});

test("die heilen Zeilen kommen weiterhin an, letzte gewinnt", () => {
  const later = '{"session_id":"rg-a","frame":"000001","square":"a1","label":"bK"}';

  const got = dedupCorrections(readJsonl(`${A}\n${B}\n${later}\n`));

  expect([...got.values()]).toEqual(["bK", "wQ"]);
});
