import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";

// The TS twin of android's CommentBudgetTest: blocks over LIMIT lines fail unless budgeted,
// and a budget entry may only shrink (CLAUDE.md: default is NO comment, 5 lines is the ceiling).
const LIMIT = 5;
const ROOT = path.join(__dirname, "..");
const BUDGET_FILE = path.join(ROOT, "comment-budget.txt");
const SCAN = ["app", "lib", "components", "instrumentation.ts"];
const SOURCE = /\.(ts|tsx)$/;

function sourceFiles(entry: string): string[] {
  const full = path.join(ROOT, entry);
  const stat = readdirSync(ROOT).includes(entry.split(path.sep)[0]) ? full : null;
  if (!stat) return [];
  try {
    return readdirSync(full, { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile() && SOURCE.test(d.name) && !d.name.endsWith(".test.ts"))
      .map((d) => path.join(d.parentPath ?? (d as { path?: string }).path ?? full, d.name));
  } catch {
    return SOURCE.test(entry) ? [full] : [];
  }
}

/** `"files/games/*.pgn"` ist kein Blockanfang: ein `/*` in einem Text schaltete den Scanner um,
 *  und der zaehlte danach CODE als Kommentar — `reference-chip.tsx` stand damit auf 5 von 5. */
const withoutStrings = (line: string): string =>
  line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');

function longestRun(text: string): number {
  let run = 0;
  let worst = 0;
  let inBlock = false;
  for (const raw of text.split("\n")) {
    const line = withoutStrings(raw).trim();
    const comment =
      inBlock || line.startsWith("//") || line.startsWith("/*") || line.startsWith("{/*") || line.startsWith("*");
    if (line.includes("/*") && !line.includes("*/")) inBlock = true;
    if (line.includes("*/")) inBlock = false;
    if (comment && line.length > 0) {
      run += 1;
      worst = Math.max(worst, run);
    } else {
      run = 0;
    }
  }
  return worst;
}

function budget(): Map<string, number> {
  const out = new Map<string, number>();
  try {
    for (const line of readFileSync(BUDGET_FILE, "utf8").replace(/^﻿/, "").split("\n")) {
      const [file, n] = line.trim().split(/\s+/);
      if (file && n) out.set(file, Number(n));
    }
  } catch {
    /* no budget file = every file on the hard limit */
  }
  return out;
}

/** Gegenprobe: was die Ratsche fangen MUSS, und was sie nicht erfinden darf. */
test("der Kommentar-Scanner zaehlt Kommentare, nicht Code hinter einem Glob", () => {
  expect(longestRun('const why = "games/*.pgn";\ncode();\nmore();\nstill();')).toBe(0);
  expect(longestRun("// a\n// b\n// c\ncode();\n// d")).toBe(3);
  expect(longestRun("/**\n * a\n * b\n */\ncode();")).toBe(4);
  expect(longestRun("code(); // kurz\ncode();")).toBe(0);
});

test(`no comment block over ${LIMIT} lines outside the shrinking budget`, () => {
  const allowed = budget();
  const seen = new Set<string>();
  const over: string[] = [];
  for (const file of SCAN.flatMap(sourceFiles)) {
    const rel = path.relative(ROOT, file).replaceAll("\\", "/");
    const worst = longestRun(readFileSync(file, "utf8"));
    const cap = allowed.get(rel);
    if (cap !== undefined) {
      seen.add(rel);
      if (worst > cap) over.push(`${rel}: block of ${worst} lines, budget says ${cap} — shrink the comment`);
      if (worst < cap) over.push(`${rel}: worst block is ${worst}, budget says ${cap} — lower the budget line`);
    } else if (worst > LIMIT) {
      over.push(`${rel}: block of ${worst} lines, limit is ${LIMIT} — cut it or say why in <= ${LIMIT}`);
    }
  }
  for (const file of allowed.keys()) {
    if (!seen.has(file)) over.push(`${file}: budgeted but gone — remove its budget line`);
  }
  expect(over, over.join("\n")).toEqual([]);
});
