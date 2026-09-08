import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

/**
 * No source line may be double-encoded UTF-8.
 *
 * `drain-status.tsx` shipped `Â·` and `lÃ¤uft` to the sidebar for who knows how long: its text is
 * built from template literals, so whatever stands in the source is what the user reads. An editor
 * that saves as cp1252 what it read as UTF-8 does this silently and eslint has no opinion on it.
 */
const ROOTS = ["app", "components", "lib"];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * The round trip IS the test: re-read the text as the single bytes cp1252 would have written, and
 * if that decodes as UTF-8 into something else, the mangling already happened. Latin-1 too, which
 * misses `—` and `…` (they arrive through cp1252's 0x80..0x9F) but catches what cp1252 refuses.
 */
function doubleEncoded(line: string): string | null {
  for (const enc of ["windows-1252", "latin1"]) {
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array([...line].map(charToByte(enc)));
    } catch {
      continue;
    }
    const back = new TextDecoder("utf-8", { fatal: true });
    try {
      const out = back.decode(bytes);
      if (out !== line) return out;
    } catch {
      /* not valid UTF-8 once folded down: this line was never double-encoded */
    }
  }
  return null;
}

/** cp1252 maps 0x80..0x9F to punctuation; every other byte is its own code point or absent. */
const CP1252_HIGH = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function charToByte(enc: string): (c: string) => number {
  return (c) => {
    const code = c.codePointAt(0) ?? 0;
    if (code < 0x100) return code;
    const at = enc === "windows-1252" ? CP1252_HIGH.indexOf(c) : -1;
    if (at < 0) throw new Error("not representable");
    return 0x80 + at;
  };
}

test("no source line carries double-encoded UTF-8", async () => {
  const root = process.cwd();
  const files = (await Promise.all(ROOTS.map((r) => walk(path.join(root, r))))).flat();
  const offences: string[] = [];
  for (const file of files) {
    if (file.endsWith("encoding.test.ts")) continue;
    const body = await readFile(file, "utf8");
    body.split("\n").forEach((line, i) => {
      const fixed = doubleEncoded(line);
      if (fixed) offences.push(`${path.relative(root, file)}:${i + 1} → ${fixed.trim().slice(0, 80)}`);
    });
  }
  expect(offences).toEqual([]);
});

test("the round trip recognises the strings that actually shipped", () => {
  expect(doubleEncoded("`${drain.step} fertig Â· ${name}`")).toBe("`${drain.step} fertig · ${name}`");
  expect(doubleEncoded('return "â€¦";')).toBe('return "…";');
  expect(doubleEncoded("nichts lÃ¤uft")).toBe("nichts läuft");
  // Correct German and correct punctuation must survive untouched, or the guard is a nuisance.
  expect(doubleEncoded("nichts läuft · 24 Halbzüge — fertig…")).toBeNull();
  expect(doubleEncoded("plain ascii only")).toBeNull();
});
