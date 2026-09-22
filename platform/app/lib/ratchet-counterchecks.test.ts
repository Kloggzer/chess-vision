/** Je eine EINGEPFLANZTE Gegenprobe, wie `tests/test_ratchet_counterchecks.py` und
 *  `CommentBudgetCounterCheckTest.kt`: geprueft wird der ERKENNER, nicht die Liste — ein Verstoss
 *  MUSS zaehlen, ein erlaubter Fall darf es NICHT. Alle lagen an derselben Stelle falsch:
 *  ein Vorkommen in einem Text oder Kommentar galt als Code (`@/ratchet-detect`). */
import { expect, test } from "vitest";
import { commentRunIn, jsonlCutsIn, measurementDoorsIn, routeImportsIn, writeDoorsIn } from "@/ratchet-detect";

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

// --- Mess-Tueren --------------------------------------------------------------------------

/** Die FORM, nicht eine Schreibweise: jede Art, ein gescheitertes Lesen zu einer leeren Antwort
 *  zu machen, muss zaehlen. Genau hier lag der Routen-Erkenner falsch — er suchte `post(`. */
test("jede Form des geschluckten Lesefehlers zaehlt", () => {
  const planted = [
    'const t = await readFile(f, "utf8").catch(() => "");',
    "const rows = await loadFlags().catch(() => []);",
    "const m = await loadMatte(n).catch(() => new Map());",
    "const r = await loadModelReads(n).catch(() => ({ rows: [] }));",
    "const r = await loadModelReads(n).catch((e) => ({ rows: [], header: null }));",
    "const x = await readFile(f).catch(function () { return null; });",
    "let s;\ntry { s = await loadSession(n); } catch { s = null; }",
    "try { return jsonlRowsStrict(f, await readFile(f)); } catch (e) { return []; }",
    "for (const o of jsonlRows(text)) { use(o); }",
  ];
  for (const form of planted) expect(measurementDoorsIn(form), form).toBeGreaterThan(0);
});

/** Der Erkenner zeigte auf den FUNKTIONSNAMEN und schloss `readdir`/`stat` als
 *  „Verzeichnisfrage" aus — im Pool entscheidet genau `readdir`, ob der gemessene Korpus null
 *  Aufnahmen hat. Entscheidend ist, ob eine MESSPOPULATION entsteht. */
test("ein Verzeichnis-Lesen zaehlt, sobald daraus eine Messpopulation wird", () => {
  const planted = [
    "const games = await readdir(recordings).catch(() => []);\nreturn games.length;",
    "const names = await readdir(dir).catch(() => [] as string[]);",
    "let e;\ntry { e = await readdir(root, { withFileTypes: true }); } catch { return []; }",
    'const key = await stat(log).then((s) => s.mtimeMs, () => "none");\nif (key === "none") return null;',
  ];
  for (const form of planted) expect(measurementDoorsIn(form), form).toBeGreaterThan(0);
});

/** Eine strukturierte Leere ist dieselbe Luege wie `null`: das Feld, das die Messung traegt,
 *  ist leer, und die Huelle drumherum macht sie nur unsichtbar. */
test("eine strukturierte Leere hinter einem Lesen zaehlt", () => {
  const planted = [
    'try { return meta(await readFile(f, "utf8")); } catch { return { classMode: null }; }',
    'try { return parse(n, JSON.parse(await readFile(f, "utf8"))); } catch { return { file: n, runs: [] }; }',
  ];
  for (const form of planted) expect(measurementDoorsIn(form), form).toBeGreaterThan(0);
});

test("wer den Fehler DURCHLAESST oder gar nicht liest, faellt nicht in die Liste", () => {
  // Der Bauplan selbst: ENOENT ist die einzige leere Antwort, alles andere wirft.
  expect(measurementDoorsIn(
    'let t;\ntry { t = await readFile(f, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; return MISSING; }',
  )).toBe(0);
  expect(measurementDoorsIn("await rm(tmp, { force: true }).catch(() => {});")).toBe(0);
  // Ein `stat`, dessen Antwort nur da/nicht-da ist, misst nichts — daraus wird keine Population.
  expect(measurementDoorsIn("const present = await stat(f).then(() => true, () => false);")).toBe(0);
  // Ein `catch`, der eine Antwort BAUT statt zu schweigen, ist kein geschluckter Fehler.
  expect(measurementDoorsIn('try { await readFile(f); } catch { return { fehler: String(e) }; }')).toBe(0);
});

test("ein geschluckter Lesefehler im Kommentar oder in einer Zeichenkette zaehlt nicht", () => {
  expect(measurementDoorsIn('// frueher: readFile(f).catch(() => "")')).toBe(0);
  expect(measurementDoorsIn('/** Nicht mehr: loadFlags().catch(() => []) */')).toBe(0);
  expect(measurementDoorsIn('const hinweis = "readFile(f).catch(() => \'\')";')).toBe(0);
  expect(measurementDoorsIn("const hilfe = `for (const o of jsonlRows(t)) {}`;")).toBe(0);
});
