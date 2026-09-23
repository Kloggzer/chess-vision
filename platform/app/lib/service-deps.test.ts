/** Der Store meldet, die Kette startet: `lib/session-store/` importiert nichts aus `lib/chain/`
 *  (`docs/web-architektur.md`). Die Rueckkante `matte-fix -> chain/jobs` ist so entfernt worden. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

const ROOT = path.join(__dirname, "..");
const CHAIN = /(?:from\s+|import\s*\(\s*)["']@\/lib\/chain\/[^"']+["']/g;

const chainImportsIn = (text: string): string[] => [...text.matchAll(CHAIN)].map((m) => m[0]);

test("lib/session-store/ haengt nicht an lib/chain/", async () => {
  const dir = path.join(ROOT, "lib", "session-store");
  const offences: string[] = [];
  for (const file of (await readdir(dir)).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"))) {
    for (const hit of chainImportsIn(await readFile(path.join(dir, file), "utf8"))) offences.push(`${file}: ${hit}`);
  }
  expect(offences, "der Store meldet, die Kette startet — ruf ihn aus lib/chain/ auf").toEqual([]);
});

test("Gegenprobe: statischer, Typ- und dynamischer Import zaehlen, ein Kommentar-Pfad nicht", () => {
  expect(chainImportsIn('import { busy } from "@/lib/chain/slot";')).toHaveLength(1);
  expect(chainImportsIn("import type { Job } from '@/lib/chain/slot';")).toHaveLength(1);
  expect(chainImportsIn('const m = await import("@/lib/chain/jobs");')).toHaveLength(1);
  expect(chainImportsIn("// wie `lib/chain/jobs.ts`")).toEqual([]);
});
