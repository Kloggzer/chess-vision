/** Je eine EINGEPFLANZTE Gegenprobe, wie `tests/test_ratchet_counterchecks.py` und
 *  `CommentBudgetCounterCheckTest.kt`: geprueft wird der ERKENNER, nicht die Liste — ein Verstoss
 *  MUSS zaehlen, ein erlaubter Fall darf es NICHT. Alle vier lagen an derselben Stelle falsch:
 *  ein Vorkommen in einem Text oder Kommentar galt als Code (`@/ratchet-detect`). */
import { expect, test } from "vitest";
import { commentRunIn, jsonlCutsIn, routeImportsIn, writeDoorsIn } from "@/ratchet-detect";

const NL = String.fromCharCode(92) + "n";
const laeuft = (body: string) => `${body}
test("x", () => {});
`;
/** Der Pfad wird zusammengesetzt: stuende er als Ganzes da, wiese diese Datei dem Sammler eine
 *  Route als getestet aus, die es nicht gibt — genau der Fehler, den sie pruefen soll. */
const AT = "@/app/";
const imp = (pfad: string, q = '"') => `import { GET } from ${q}${AT}${pfad}/route${q};`;

// --- Routen-Abdeckung ---------------------------------------------------------------------

test("ein echter Routen-Import zaehlt, in beiden Anfuehrungszeichen", () => {
  expect(routeImportsIn(laeuft(imp("api/echt")))).toEqual(["api/echt"]);
  expect(routeImportsIn(laeuft(imp("api/echt", "'")))).toEqual(["api/echt"]);
  expect(routeImportsIn(laeuft(`const m = await import("${AT}api/echt/route");`))).toEqual(["api/echt"]);
  expect(routeImportsIn(`${imp("api/echt")}
test.each([1])("x", () => {});`)).toEqual(["api/echt"]);
});

test("ein auskommentierter Import deckt keine Route", () => {
  expect(routeImportsIn(laeuft(`// ${imp("api/erfunden")}`))).toEqual([]);
  expect(routeImportsIn(laeuft(`/* ${imp("api/erfunden")} */`))).toEqual([]);
});

test("der blosse Pfad in einer Zeichenkette deckt keine Route", () => {
  expect(routeImportsIn(laeuft(`await writeFile(f, '"${AT}api/erfunden/route"');`))).toEqual([]);
});

test("ein uebersprungener Test fuehrt die Route nie aus", () => {
  const datei = `${imp("api/echt")}
`;
  expect(routeImportsIn(`${datei}describe.skip("x", () => { test("y", () => {}); });`)).toEqual([]);
  expect(routeImportsIn(`${datei}it.todo("y");`)).toEqual([]);
  expect(routeImportsIn(`${datei}test.skip("y", () => {});
test("z", () => {});`)).toEqual(["api/echt"]);
});

// --- JSONL-Leser --------------------------------------------------------------------------

test("ein eingepflanzter Zeilenschnitt zaehlt, der im Kommentar nicht", () => {
  expect(jsonlCutsIn(`const rows = text.split("${NL}");`)).toBe(1);

  expect(jsonlCutsIn(`// frueher stand hier text.split("${NL}")`)).toBe(0);
  expect(jsonlCutsIn(`/** Nicht mehr: text.split("${NL}") */`)).toBe(0);
});

// --- Schreib-Tueren -----------------------------------------------------------------------

test("eine eingepflanzte Schreib-Tuer zaehlt, die im Kommentar nicht", () => {
  expect(writeDoorsIn("await writeFile(f, JSON.stringify(rows));")).toBe(1);

  expect(writeDoorsIn("// hier stand writeFile(f, JSON.stringify(rows))")).toBe(0);
  expect(writeDoorsIn("/*\n * writeFile(f, JSON.stringify(rows))\n */")).toBe(0);
});

// --- Kommentar-Budget ---------------------------------------------------------------------

test("ein zu langer Kommentarblock zaehlt, ein Text mit `//`-Zeilen nicht", () => {
  expect(commentRunIn("// 1\n// 2\n// 3\n// 4\n// 5\n// 6\ncode();")).toBe(6);

  const literal = ["const hilfe = `", "// 1", "// 2", "// 3", "// 4", "// 5", "// 6", "`;"].join("\n");
  expect(commentRunIn(literal), "Zeilen in einem Template-Literal sind kein Kommentarblock").toBe(0);
  expect(commentRunIn('const p = "a/*b";\ncode();\nmehr();\nnoch();\nund();\nfertig();')).toBe(0);
});
