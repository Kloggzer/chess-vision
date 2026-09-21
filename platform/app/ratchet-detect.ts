/** Die ERKENNER der fuenf Web-Ratschen, herausgezogen, damit eine Gegenprobe einen Verstoss
 *  EINPFLANZEN kann (`lib/ratchet-counterchecks.test.ts`). Liegt bewusst neben `lib/` und `app/`:
 *  die Ratschen gehen diese zwei Baeume ab, ihre eigenen Muster wuerden sich sonst selbst zaehlen. */

type Span = { kind: "code" | "string" | "comment"; from: number; to: number };

/** EIN Durchgang, der Zeichenketten und Kommentare auseinanderhaelt. Zeilenweise Erkenner lagen
 *  an genau dieser Stelle falsch: ein `/*` in einem Text schaltete den Kommentarmodus an, und ein
 *  `writeFile(` in einem Kommentar galt als Tuer. */
function spans(text: string): Span[] {
  const out: Span[] = [];
  let i = 0;
  let code = 0;
  const flush = (to: number) => {
    if (to > code) out.push({ kind: "code", from: code, to });
  };
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"' || c === "'" || c === "`") {
      flush(i);
      const end = endOfString(text, i);
      out.push({ kind: "string", from: i, to: end });
      i = end;
      code = end;
    } else if (c === "/" && (next === "/" || next === "*")) {
      flush(i);
      const close = next === "/" ? text.indexOf("\n", i) : text.indexOf("*/", i + 2);
      const end = close < 0 ? text.length : close + (next === "/" ? 0 : 2);
      out.push({ kind: "comment", from: i, to: end });
      i = end;
      code = end;
    } else {
      i += 1;
    }
  }
  flush(text.length);
  return out;
}


function endOfString(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === "\\") i += 1;
    else if (text[i] === quote) return i + 1;
    else if (text[i] === "\n" && quote !== "`") return i;
  }
  return text.length;
}

/** Kommentare zu Leerraum, Zeichenketten und Zeilenumbrueche bleiben stehen. */
export function withoutComments(text: string): string {
  let out = "";
  for (const s of spans(text)) {
    const piece = text.slice(s.from, s.to);
    out += s.kind === "comment" ? piece.replace(/[^\n]/g, " ") : piece;
  }
  return out;
}

// --- Routen-Abdeckung -----------------------------------------------------------------------

const ROUTE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']@\/app\/(.+?)\/route["']/g;
const TEST_CALL = /\b(?:test|it|describe)((?:\.\w+)*)\s*\(/g;

/** Nur ein Test, der auch LAEUFT, deckt eine Route: eine Datei, in der jedes `test`/`describe`
 *  auf `.skip`/`.todo` steht, importiert die Route und fuehrt sie nie aus. */
function runsSomething(code: string): boolean {
  const live = withoutSkippedSuites(code);
  for (const m of live.matchAll(TEST_CALL)) if (!/\.(skip|todo)\b/.test(m[1])) return true;
  return false;
}

/** Ein `test(` im Rumpf eines `describe.skip` laeuft nicht — die Klammer zaehlt ab, wo er endet. */
function withoutSkippedSuites(code: string): string {
  const SUITE = /\bdescribe((?:\.\w+)*)\s*\(/g;
  let out = code;
  for (const m of [...code.matchAll(SUITE)].reverse()) {
    if (!/\.(skip|todo)\b/.test(m[1])) continue;
    const open = (m.index ?? 0) + m[0].length - 1;
    out = out.slice(0, m.index) + out.slice(closingParen(out, open) + 1);
  }
  return out;
}

function closingParen(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") i = endOfString(text, i) - 1;
    else if (c === "(") depth += 1;
    else if (c === ")" && (depth -= 1) === 0) return i;
  }
  return text.length;
}

/** Die Route gilt als getestet, wenn eine Testdatei ihr Modul wirklich IMPORTIERT — ein
 *  auskommentierter Import und der blosse Pfad in einer Zeichenkette zaehlen nicht. */
export function routeImportsIn(text: string): string[] {
  const code = withoutComments(text);
  if (!runsSomething(code)) return [];
  return [...code.matchAll(ROUTE_IMPORT)].map((m) => m[1]);
}

// --- JSONL-Leser ----------------------------------------------------------------------------

/** Die FORM, nicht vier Schreibweisen: ein `split` auf irgendetwas, das einen Umbruch enthaelt. */
const CUT =
  /\.split\(\s*(?:"[^"\n]*\\n[^"\n]*"|'[^'\n]*\\n[^'\n]*'|`[^`\n]*\\n[^`\n]*`|\/[^/\n]*\\n[^/\n]*\/[a-z]*|String\.fromCharCode\(10\))\s*\)/g;
/** Zeilenweise ITERATION ist derselbe Schnitt, nur unsichtbar fuer eine Textsuche. */
const ITER = /for\s+(?:await\s+)?\(\s*const\s+(\w+)\s+of\s+([\w.]+)/g;

/** Der Rumpf der Schleife, ueber die Klammern abgezaehlt — `JSON.parse` irgendwo SONST in
 *  derselben Datei ist ein anderer Gueltigkeitsbereich und zaehlte zweimal falsch mit. */
function loopBody(text: string, from: number): string {
  const open = text.indexOf("{", from);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}" && (depth -= 1) === 0) return text.slice(open, i);
  }
  return text.slice(open);
}

export function jsonlCutsIn(source: string): number {
  const text = withoutComments(source);
  const split = [...text.matchAll(CUT)].length;
  let iter = 0;
  for (const m of text.matchAll(ITER)) {
    // Der Treuhaender selbst ist kein eigener Schnitt.
    if (m[2].startsWith("jsonlRows")) continue;
    const body = loopBody(text, (m.index ?? 0) + m[0].length);
    if (new RegExp(String.raw`JSON\.parse\(\s*` + m[1] + String.raw`\b`).test(body)) iter += 1;
  }
  return split + iter;
}

// --- Schreib-Tueren -------------------------------------------------------------------------

/** Die vier Schreibweisen, in denen diese App eine Datei anlegt — `writeFileAtomic(` faellt raus. */
const WRITE = /\b(writeFile|appendFile|writeFileSync|appendFileSync)\(/;
const JSONISH = /JSON\.stringify\(|\.jsonl?["'`]/;
/** Ein Log, das nur ein Mensch liest, ist keine Datei, um die sich zwei Prozesse streiten. */
const NOT_JSON = /\.(log|txt|pgn|csv|webp|png)["'`]/;

/** Schreibaufruf UND JSON in derselben Sichtweite — das ist die Form, die die Politik neu erfindet. */
export function writeDoorsIn(source: string): number {
  const lines = withoutComments(source).split("\n");
  return lines.filter(
    (line, i) => WRITE.test(line) && !NOT_JSON.test(line) && JSONISH.test(lines.slice(i, i + 6).join("\n")),
  ).length;
}

// --- Kommentar-Budget -----------------------------------------------------------------------

/** Der laengste Block aus Zeilen, die NUR Kommentar tragen. */
export function commentRunIn(source: string): number {
  const lines = source.split("\n");
  const hasCode = lines.map(() => false);
  const hasComment = lines.map(() => false);
  const lineAt = lineIndex(source);
  for (const s of spans(source)) {
    const text = source.slice(s.from, s.to);
    if (s.kind === "comment") for (let l = lineAt(s.from); l <= lineAt(s.to - 1); l += 1) hasComment[l] = true;
    else if (text.trim().length > 0) mark(hasCode, lines, lineAt(s.from), text);
  }
  let run = 0;
  let worst = 0;
  for (let l = 0; l < lines.length; l += 1) {
    run = hasComment[l] && !hasCode[l] ? run + 1 : 0;
    worst = Math.max(worst, run);
  }
  return worst;
}

/** Ein mehrzeiliges Literal traegt nur dort Code, wo wirklich Zeichen stehen — eine `//`-Zeile in
 *  seinem Inneren ist weder Code noch Kommentar und bricht den Block. */
function mark(hasCode: boolean[], lines: string[], first: number, text: string) {
  text.split("\n").forEach((part, i) => {
    if (part.trim().length > 0 && first + i < lines.length) hasCode[first + i] = true;
  });
}

function lineIndex(text: string): (at: number) => number {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === "\n") starts.push(i + 1);
  return (at) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}

// --- Mess-Tueren -----------------------------------------------------------------------------

/** Die leeren Antworten, in denen „nie gemessen" steckt, ohne dass es dasteht. */
const EMPTY =
  /^\s*\(?\s*(\[\s*\]|\{\s*\}|null|undefined|""|''|``|0|false|new Map\(\s*\)|new Set\(\s*\)|\{[^{}]*(\[\s*\]|new Map\(\s*\)|new Set\(\s*\))[^{}]*\})\s*\)?\s*$/;
/** Ein Lesen, dessen Scheitern eine MESSUNG betrifft — `stat`/`readdir` sind Verzeichnisfragen. */
const READS = /\b(readFile|readJsonl|jsonlRows|jsonlRowsStrict|loadMeasurement|load[A-Z]\w*)\s*(\(|<)/;

/** Wie `withoutComments`, aber der INHALT von Zeichenketten faellt auch weg: ein
 *  `.catch(() => "")` in einem Hinweistext ist kein Leser. Laenge und Umbrueche bleiben. */
function codeOnly(text: string): string {
  let out = "";
  for (const s of spans(text)) {
    const piece = text.slice(s.from, s.to);
    if (s.kind === "comment") out += piece.replace(/[^\n]/g, " ");
    else if (s.kind === "string")
      out += piece[0] + piece.slice(1, -1).replace(/[^\n]/g, " ") + (piece.length > 1 ? piece.at(-1) : "");
    else out += piece;
  }
  return out;
}

/** Das Argument des `.catch(`, ueber die Klammern abgezaehlt statt ueber ein gieriges Muster. */
function catchArg(text: string, at: number): string {
  const open = text.indexOf("(", at);
  return open < 0 ? "" : text.slice(open + 1, closingParen(text, open));
}

/** Was ein `catch`-Griff ZURUECKGIBT — Pfeil oder `function`. Der Routen-Erkenner sah
 *  `post<{...}>(...)` nicht, weil er EINE Schreibweise suchte statt der Form; hier zaehlen beide. */
function handlerResult(body: string): string | null {
  const arrow = body.indexOf("=>");
  if (arrow >= 0 && !/\bfunction\b/.test(body.slice(0, arrow))) return body.slice(arrow + 2);
  if (!/^\s*(async\s+)?function\b/.test(body)) return null;
  const hits = [...body.matchAll(/\breturn\b([^;}]*)/g)];
  return hits.length === 1 ? hits[0][1] : null;
}

/** Ein Griff SCHLUCKT, wenn er nichts weiterreicht und nichts baut: kein `throw`, und was er
 *  zurueckgibt oder zuweist ist leer. Ein `catch`, der einen Fehler MELDET, ist keine Tuer. */
function swallows(handler: string): boolean {
  if (/\bthrow\b/.test(handler)) return false;
  const values = [
    ...[...handler.matchAll(/\breturn\b([^;}]*)/g)].map((m) => m[1]),
    ...[...handler.matchAll(/(?<![=!<>])=(?![=>])([^;}]*)/g)].map((m) => m[1]),
  ].filter((v) => v.trim().length > 0);
  return values.length === 0 ? true : values.every((v) => EMPTY.test(v));
}

/** Die FORM, die die Politik fuenfmal neu erfand: ein gescheitertes LESEN wird zu einer leeren
 *  Antwort, und „nicht gemessen" ist danach von „gemessen null" nicht zu unterscheiden. */
export function measurementDoorsIn(source: string): number {
  const text = codeOnly(source);
  let n = [...text.matchAll(/\bjsonlRows\s*\(/g)].length;
  for (const m of text.matchAll(/\.catch\s*\(/g)) {
    const at = m.index ?? 0;
    const result = handlerResult(catchArg(text, at + m[0].length - 1));
    if (result === null || !EMPTY.test(result)) continue;
    if (READS.test(text.slice(Math.max(0, at - 240), at))) n += 1;
  }
  for (const m of text.matchAll(/\btry\s*\{/g)) {
    const open = text.indexOf("{", m.index ?? 0);
    const body = loopBody(text, open);
    if (!READS.test(body)) continue;
    const after = text.slice(open + body.length);
    const c = /^\s*\}\s*catch\s*(\([^)]*\))?\s*\{/.exec(after);
    if (!c) continue;
    if (swallows(loopBody(after, after.indexOf("{", c[0].length - 1)))) n += 1;
  }
  return n;
}
