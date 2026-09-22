/** Drei Stellen, an denen ein Erkenner UNGEDECKT als gedeckt meldet — dieselbe Wurzel wie
 *  `describe.skip` am 2026-09-21: gezaehlt wurde die Schreibweise des Imports, nicht die Frage,
 *  ob der Rumpf je LAEUFT. Die Route-Faelle zeigen die gefaehrliche Richtung (zu viel Deckung). */
import { expect, test } from "vitest";
import { routeImportsIn, writeDoorsIn } from "@/ratchet-detect";

const AT = "@/app/";
const imp = (pfad: string) => `import { GET } from "${AT}${pfad}/route";`;

test("ein `describe` ohne einen einzigen laufenden Test deckt keine Route", () => {
  expect(routeImportsIn(`${imp("api/echt")}
describe("x", () => { test.skip("y", () => {}); it.todo("z"); });`)).toEqual([]);
  expect(routeImportsIn(`${imp("api/echt")}
describe("x", () => {});`)).toEqual([]);

  expect(routeImportsIn(`${imp("api/echt")}
describe("x", () => { test("y", () => {}); });`)).toEqual(["api/echt"]);
});

test("ein Nur-Typ-Import fuehrt die Route nie aus", () => {
  expect(routeImportsIn(`import type { GET } from "${AT}api/erfunden/route";
test("y", () => {});`)).toEqual([]);

  expect(routeImportsIn(`${imp("api/echt")}
test("y", () => {});`)).toEqual(["api/echt"]);
});

test("eine Schreib-Tuer zaehlt auch, wenn das JSON eine Zeile FRUEHER gebaut wird", () => {
  expect(writeDoorsIn(`const body = JSON.stringify(rows);
await writeFile(ziel, body, "utf8");`)).toBe(1);

  expect(writeDoorsIn(`const body = rows.join("|");
await writeFile(ziel, body, "utf8");`)).toBe(0);
});
