import { expect, test } from "vitest";
import { evictOldest, keepHot } from "@/lib/crops";

/**
 * Der Raster-Cache verdraengte nach EINFUEGE-Reihenfolge: ein Treffer stellte den Eintrag nicht
 * hinten an, also flog der heisseste Frame zuerst raus. `cellPngs` daneben machte es richtig —
 * zwei Regeln fuer dieselbe Frage, und die falsche sass auf dem teureren Cache (ein 1080p-Raster
 * kostet ~0,25 s Dekodierung).
 */
test("a hit is the last thing evicted, not the first", () => {
  const cache = new Map([["a", 1], ["b", 2], ["c", 3]]);

  keepHot(cache, "a", cache.get("a")!);
  evictOldest(cache, 2);

  expect([...cache.keys()], "b war am laengsten ungenutzt").toEqual(["c", "a"]);
});

test("without a hit the oldest goes, and the order is otherwise untouched", () => {
  const cache = new Map([["a", 1], ["b", 2], ["c", 3]]);

  evictOldest(cache, 2);

  expect([...cache.keys()]).toEqual(["b", "c"]);
});

test("under the limit nothing is evicted", () => {
  const cache = new Map([["a", 1], ["b", 2]]);

  evictOldest(cache, 2);

  expect(cache.size).toBe(2);
});

test("keepHot returns the value, so a caller can `return keepHot(...)`", () => {
  const cache = new Map([["a", 1]]);

  expect(keepHot(cache, "a", 1)).toBe(1);
});
