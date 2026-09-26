/** Ein stiller `.catch` auf einem POST liess den Knopf zuruecksnappen, als waere nichts gewesen. */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";

async function source(...parts: string[]): Promise<string> {
  return readFile(path.join(process.cwd(), ...parts), "utf8");
}

/** Der Rumpf einer Funktion, grob: von ihrer Deklaration bis zur naechsten auf gleicher Ebene. */
function body(text: string, head: string): string {
  const at = text.indexOf(head);
  expect(at, `${head} nicht gefunden`).toBeGreaterThan(-1);
  const rest = text.slice(at + head.length);
  const next = rest.search(/\n {2}(?:const|function|async function|useEffect|return)\b/);
  return next < 0 ? rest : rest.slice(0, next);
}

test("der Drain-Knopf meldet einen fehlgeschlagenen POST", async () => {
  const post = body(await source("app", "drain-status.tsx"), "const post = useCallback(");
  expect(post).toContain("fetchJson<DrainStatus>(\"/api/drain\"");
  const tail = post.slice(post.indexOf(".catch("));
  expect(tail, "ein stiller catch: der Druck hinterlaesst keine Spur").toMatch(/setNote\(/);
});

test("der Label-Knopf auf /transfers meldet einen fehlgeschlagenen POST", async () => {
  const start = body(await source("app", "transfers", "board.tsx"), "async function startLabel(");
  expect(start).toContain("fetchJson<Job>(`/api/ingest/session/");
  expect(start, "ohne catch bleibt nur eine unbehandelte Rejection").toMatch(/catch[\s\S]*setNote\(/);
});
