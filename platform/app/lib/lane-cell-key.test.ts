import { expect, test } from "vitest";
import { laneCellKey } from "@/lib/label/lanes";

/** Zelllane und Handy-Sortierung bauten den Schluessel je selbst — die Referenz der Paritaet. */
const legacyKeyOf = (c: { session: number; stem: string; square: string }) => `${c.session}|${c.stem}|${c.square}`;

test("laneCellKey baut denselben Schluessel wie die beiden Kopien", () => {
  for (const c of [{ session: 0, stem: "000123", square: "a8" }, { session: 17, stem: "f|x", square: "h1" }]) {
    expect(laneCellKey(c)).toBe(legacyKeyOf(c));
  }
  expect(laneCellKey({ session: 1, stem: "2", square: "e4" })).not.toBe(laneCellKey({ session: 12, stem: "", square: "e4" }));
});
