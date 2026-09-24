/** Eingepflanzte Gegenproben auf den ERKENNER, nicht die Liste: ein Verstoss MUSS zaehlen, ein
 *  erlaubter Fall darf es NICHT. Alle lagen gleich falsch: Text oder Kommentar galt als Code. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { commentRunIn, jsonlCutsIn, measurementDoorsIn, routeImportsIn, writeDoorsIn } from "@/ratchet-detect";

const NL = String.fromCharCode(92) + "n";
const laeuft = (body: string) => `${body}
test("x", () => {});
`;
/** Zusammengesetzt, sonst wiese diese Datei dem Sammler eine erfundene Route als getestet aus. */
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

// Gezaehlt wurde die Schreibweise des Imports, nicht ob der Rumpf je LAEUFT.
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

test("eine Schreib-Tuer zaehlt auch, wenn das JSON eine Zeile FRUEHER gebaut wird", () => {
  expect(writeDoorsIn(`const body = JSON.stringify(rows);
await writeFile(ziel, body, "utf8");`)).toBe(1);

  expect(writeDoorsIn(`const body = rows.join("|");
await writeFile(ziel, body, "utf8");`)).toBe(0);
});

// --- Kommentar-Budget ---------------------------------------------------------------------

test("ein zu langer Kommentarblock zaehlt, ein Text mit `//`-Zeilen nicht", () => {
  expect(commentRunIn("// 1\n// 2\n// 3\n// 4\n// 5\n// 6\ncode();")).toBe(6);

  const literal = ["const hilfe = `", "// 1", "// 2", "// 3", "// 4", "// 5", "// 6", "`;"].join("\n");
  expect(commentRunIn(literal), "Zeilen in einem Template-Literal sind kein Kommentarblock").toBe(0);
  expect(commentRunIn('const p = "a/*b";\ncode();\nmehr();\nnoch();\nund();\nfertig();')).toBe(0);
});

// --- Mess-Tueren --------------------------------------------------------------------------

// Die FORM, nicht eine Schreibweise — der Routen-Erkenner suchte einst nur `post(`.
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

// `readdir` galt als „Verzeichnisfrage" — im Pool entscheidet genau es, ob der Korpus null Aufnahmen hat.
test("ein Verzeichnis-Lesen zaehlt, sobald daraus eine Messpopulation wird", () => {
  const planted = [
    "const games = await readdir(recordings).catch(() => []);\nreturn games.length;",
    "const names = await readdir(dir).catch(() => [] as string[]);",
    "let e;\ntry { e = await readdir(root, { withFileTypes: true }); } catch { return []; }",
    'const key = await stat(log).then((s) => s.mtimeMs, () => "none");\nif (key === "none") return null;',
  ];
  for (const form of planted) expect(measurementDoorsIn(form), form).toBeGreaterThan(0);
});

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
  // Ein `stat`, der ENOENT von jedem anderen Fehler trennt, ist die Tuer selbst.
  expect(measurementDoorsIn("const present = (await stat(f).catch(absentOnly)) !== null;")).toBe(0);
  // Ein `catch`, der eine Antwort BAUT statt zu schweigen, ist kein geschluckter Fehler.
  expect(measurementDoorsIn('try { await readFile(f); } catch { return { fehler: String(e) }; }')).toBe(0);
});

test("ein geschluckter Lesefehler im Kommentar oder in einer Zeichenkette zaehlt nicht", () => {
  expect(measurementDoorsIn('// frueher: readFile(f).catch(() => "")')).toBe(0);
  expect(measurementDoorsIn('/** Nicht mehr: loadFlags().catch(() => []) */')).toBe(0);
  expect(measurementDoorsIn('const hinweis = "readFile(f).catch(() => \'\')";')).toBe(0);
  expect(measurementDoorsIn("const hilfe = `for (const o of jsonlRows(t)) {}`;")).toBe(0);
});

// Wortgleich die Stellen vor `60c1d559`, an denen menschliche Urteile hingen.
test("eine erfundene Antwort auf `stat`/`open` zaehlt, auch als Ja/Nein", () => {
  const planted = [
    "export const stampOf = (file: string): Promise<Stamp> =>\n  stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => null);",
    'const key = await stat(file).then((s) => `${s.mtimeMs}:${s.size}`, () => "none");',
    'return stat(path.join(gameDir(name), "log.jsonl")).then(() => false, () => true);',
    "if (!(await stat(file).then(() => true, () => false))) {\n  throw new Error(`${file} is missing`);\n}",
    'const handle = await open(file, "r").catch(() => null);',
    "const s = await stat(f).catch(() => { return null; });",
  ];
  for (const form of planted) expect(measurementDoorsIn(form), form).toBeGreaterThan(0);
});

test("`catch { return false }` hinter einem Plattenzugriff zaehlt", () => {
  const exists = "async function exists(file) {\n  try {\n    await stat(file);\n    return true;\n  } catch {\n    return false;\n  }\n}";
  expect(measurementDoorsIn(exists)).toBe(1);
  expect(measurementDoorsIn("try { await access(bin); ok = true; } catch { ok = false; }")).toBe(1);
});

test("ein Sentinel wie `-1` hinter einem Plattenzugriff zaehlt", () => {
  expect(measurementDoorsIn("try {\n  return (await stat(file)).size;\n} catch {\n  return -1;\n}")).toBe(1);
  expect(measurementDoorsIn("const size = await stat(f).then((s) => s.size, () => -1);")).toBe(1);
});

test("ein geratenes Objekt-Literal als Rueckfall zaehlt", () => {
  const frameSize =
    "try {\n  const meta = await sharp(await readFile(file)).metadata();\n  return { width: meta.width ?? 720, height: meta.height ?? 816 };\n} catch {\n  return { width: 720, height: 816 };\n}";
  expect(measurementDoorsIn(frameSize)).toBe(1);
  expect(measurementDoorsIn("const d = await readFile(f).catch(() => ({ width: 720, height: 816 }));")).toBe(1);
});

test("ein `catch { return false }` ohne Plattenzugriff ist keine Mess-Tuer", () => {
  expect(measurementDoorsIn("try {\n  JSON.parse(text);\n  return true;\n} catch {\n  return false;\n}")).toBe(0);
  expect(measurementDoorsIn("const ok = await stat(f).then(() => true, (e) => { if (e.code !== \"ENOENT\") throw e; return false; });")).toBe(0);
  expect(measurementDoorsIn("const hinweis = await stat(f).then(() => 1, (e) => ({ fehler: String(e) }));")).toBe(0);
});

// Zaehlte der Erkenner die gefixten Stellen weiter, wuchse die Ratsche an richtigem Code.
test("die am 2026-09-23 umgestellten Stellen zaehlen im jetzigen Code nicht mehr", () => {
  const fixed: [string, string][] = [
    ["lib/atomic.ts", "stampOf"],
    ["lib/measurement.ts", "exists"],
    ["lib/session-store/corrections.ts", "ledgerRows"],
    ["lib/session-store/review-notes.ts", "bySession"],
    ["lib/session-store/meta.ts", "archivedAt"],
    ["lib/ingest/ingest.ts", "sizeOrAbsent"],
    ["lib/ingest/ingest.ts", "present"],
    ["lib/session-store/recordings.ts", "frameSize"],
    ["lib/session-store/recordings.ts", "requireRecording"],
    ["lib/session-store/reference.ts", "referenceOrigin"],
  ];
  for (const [file, symbol] of fixed) {
    const body = symbolIn(readFileSync(path.join(__dirname, "..", file), "utf8"), symbol);
    expect(body, `${file}::${symbol} nicht gefunden`).not.toBe("");
    expect(measurementDoorsIn(body), `${file}::${symbol}`).toBe(0);
  }
});

function symbolIn(text: string, symbol: string): string {
  const start = new RegExp(`^(?:export )?(?:async )?(?:function ${symbol}\\b|const ${symbol}\\b)`, "m").exec(text);
  if (!start) return "";
  const rest = text.slice(start.index);
  const firstLine = rest.slice(0, rest.indexOf("\n"));
  if (firstLine.trimEnd().endsWith(";")) return firstLine;
  const end = rest.search(/\n\}\n/);
  return end < 0 ? rest : rest.slice(0, end + 3);
}
