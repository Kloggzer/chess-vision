/**
 * Drei Poller lasen `r.json()` ohne `res.ok`. Der Rumpf einer 4xx/5xx-Antwort ist `{error}` und
 * traegt KEINES der Felder, die danach gelesen werden: die Leiste setzte ihn als `DrainStatus`
 * (`waiting` undefined — `visibleSteps` warf), die Karte als `{job, progress}` (`job` undefined —
 * `job.state` warf), die Transfer-Seite als `Board` und blieb auf "laedt…" stehen, waehrend die
 * Route ihren Grund schon geschrieben hatte.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { readAnswer } from "@/lib/answer";

const ROOT = path.join(__dirname, "..");

/** Die FORM des Defekts: ein `.then`-Glied, das nur `x.json()` weiterreicht — dort ist `res.ok`
 *  nie gefragt worden und kann es auch nicht mehr werden. */
const RAW_JSON = /\.then\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\s*\.json\(\)/g;

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

async function rawReaders(): Promise<string[]> {
  const hits: string[] = [];
  for (const dir of ["app", "components"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      const text = await readFile(file, "utf8");
      if (RAW_JSON.test(text)) hits.push(path.relative(ROOT, file).split(path.sep).join("/"));
      RAW_JSON.lastIndex = 0;
    }
  }
  return hits.sort();
}

test("kein Poller liest eine Fehlerantwort als Nutzlast", async () => {
  expect(await rawReaders(), "nimm `readAnswer` aus lib/answer.ts — `{error}` ist keine Messung").toEqual([]);
});

test("die Ratsche faellt auf die eingepflanzte Form", async () => {
  const planted = `fetch("/x").then((r) => r.json() as Promise<Board>).then(setBoard);`;
  RAW_JSON.lastIndex = 0;
  expect(RAW_JSON.test(planted)).toBe(true);
  RAW_JSON.lastIndex = 0;
  expect(RAW_JSON.test(`const body = (await res.json()) as T; if (!res.ok) throw new Error();`)).toBe(false);
});

const answer = (ok: boolean, body: unknown, statusText = "Bad Request") =>
  ({ ok, statusText, json: () => Promise.resolve(body) }) as unknown as Response;

test("readAnswer gibt den Rumpf nur unter 2xx heraus", async () => {
  expect(await readAnswer<{ waiting: number }>(answer(true, { waiting: 3 }))).toEqual({ waiting: 3 });
});

test("readAnswer wirft mit dem Grund, den die Route geschrieben hat", async () => {
  await expect(readAnswer(answer(false, { error: "EISDIR: jobs.jsonl" }))).rejects.toThrow(/jobs\.jsonl/);
});

test("ohne `error` im Rumpf bleibt der Statustext — nie ein leerer Erfolg", async () => {
  await expect(readAnswer(answer(false, {}, "Internal Server Error"))).rejects.toThrow(/Internal Server Error/);
});

/**
 * Der Grund muss beim EMPFAENGER ankommen. Ein berechnetes Feld, das nur gesetzt und nirgends
 * gezeigt wird, ist derselbe stille Fang mit mehr Zeilen — `handScanned` lief so ins Leere.
 */
const SHOWS = [
  ["app/shell.tsx", "fault"],
  ["app/transfers/board.tsx", "fault"],
  ["app/chain-actions.tsx", "note"],
] as const;

test.each(SHOWS)("%s zeigt `%s` wirklich an", async (rel, field) => {
  const text = await readFile(path.join(ROOT, rel), "utf8");
  const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  expect(new RegExp(String.raw`\{\s*${field}\s*\}`).test(code)).toBe(true);
});
