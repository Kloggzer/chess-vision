import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { parseCost } from "@/lib/session-delete";
import { tempDataRoot } from "@/lib/test-fixtures";

/**
 * Routen-Jagd 2026-09-16. Jeder Test haengt an einer Route, die bis heute in
 * `route-coverage.txt` stand — der Fund ist der Anlass, der Test die Ratsche.
 */

const tool = vi.hoisted(() => ({ stdout: "", code: 0, busy: false, calls: [] as string[][] }));
vi.mock("@/lib/jobs", async (original) => ({
  ...(await original<typeof import("@/lib/jobs")>()),
  busy: () => tool.busy,
  enqueuePack: async (name: string) => ({ name, state: "queued" }),
  runChesslabCapture: async (args: string[]) => {
    tool.calls.push(args);
    return { code: tool.code, stdout: tool.stdout, stderr: "", command: "chesslab " + args.join(" ") };
  },
}));

const games = vi.hoisted(() => ({ names: [] as string[] }));
vi.mock("@/lib/label-stream", async (original) => ({
  ...(await original<typeof import("@/lib/label-stream")>()),
  liveGames: async () => games.names,
}));

const { POST: sessionPost } = await import("@/app/api/session/[id]/route");
const { GET: queryGet } = await import("@/app/api/query/route");
const { POST: notePost } = await import("@/app/api/zuege/[name]/note/route");
const { POST: metaPost, GET: metaGet } = await import("@/app/api/meta/[name]/route");
const { PUT: chunkPut } = await import("@/app/api/ingest/session/[name]/chunk/route");
const { POST: completePost } = await import("@/app/api/ingest/session/[name]/complete/route");
const { POST: declarePost } = await import("@/app/api/ingest/session/route");

let root = "";
beforeEach(async () => {
  root = await tempDataRoot("routes-bughunt");
  tool.stdout = "";
  tool.code = 0;
  tool.busy = false;
  tool.calls = [];
  games.names = [];
  process.env.CHESSLAB_INGEST_TOKEN = "t0ken";
});

const params = <T>(value: T) => ({ params: Promise.resolve(value) });

/**
 * 1) `lib/session-delete.ts:26` — eine Kostenzeile ohne `frames`/`crops` wird mit `?? 0`
 * aufgefuellt. Der Dialog verspricht dann "0 Frames, 0 Crops" fuer eine Loeschung, die alles
 * mitnimmt, und der eigene Test daneben heisst "never a zero nobody counted".
 */
test("eine halbe Kostenzeile ist keine Kosten von null", async () => {
  expect(parseCost('{"session_id": "rg-x", "corrections": 12}')).toBeNull();
});

test("api/session/[id]: der Trockenlauf meldet keine erfundene Null", async () => {
  tool.stdout = '{"session_id": "rg-x", "corrections": 12}\n';
  const answer = await sessionPost(
    new Request("http://h/api/session/rg-x", { method: "POST", body: JSON.stringify({ dryRun: true }) }),
    params({ id: "rg-x" }),
  );

  expect(answer.status).toBe(400);
});

/**
 * 2) `app/api/query/route.ts:11` — `?min=` ist leer, nicht null, also greift `??` nicht und
 * `Number("")` ist 0. Die Klassenwand faellt damit stumm auf "alles zaehlt" zurueck.
 */
test("api/query: ein leeres min ist kein gemessenes null", async () => {
  const answer = await queryGet(new Request("http://h/api/query?min="));
  const body = (await answer.json()) as { filter?: { min: number }; error?: string };

  expect(body.filter?.min).toBe(0.9);
});

/**
 * 3) `lib/corpus-query.ts:46` — eine Phase, die es nicht gibt, filtert jede Zeile weg und die
 * Antwort meldet 0 Treffer als Ergebnis. Dieselbe Regel wie oben fuer die Klasse: null Treffer
 * sind eine Behauptung, kein Nichtwissen.
 */
test("api/query: eine unbekannte Phase wird abgelehnt, nicht mit 0 Treffern beantwortet", async () => {
  const answer = await queryGet(new Request("http://h/api/query?class=wP&min=0.9&phase=settle"));

  expect(answer.status).toBe(400);
});

/**
 * 4) `app/api/zuege/[name]/note/route.ts:18` — `Number(null)` ist 0 und `Number(true)` ist 1.
 * Ein Koerper ohne `ply` landet damit als Urteil ueber Halbzug 0 in `review-notes.jsonl`.
 */
test("api/zuege/[name]/note: ein fehlender ply wird nicht zu ply 0", async () => {
  const answer = await notePost(
    new Request("http://h/n", { method: "POST", body: JSON.stringify({ ply: null, reason: "x" }) }),
    params({ name: "rg-2026-09-01-00-00-00" }),
  );

  expect(answer.status).toBe(400);
});

/**
 * 5) `lib/meta.ts:32` — lesen, aendern, schreiben ohne Riegel. Zwei gleichzeitige Schreiber auf
 * dieselbe `ui-meta.json`, und der Zweite legt den Stand des Ersten zurueck; beide melden Erfolg.
 */
test("api/meta/[name]: zwei gleichzeitige Schreiber verlieren einander nicht", async () => {
  const name = "rg-2026-09-01-00-00-00";
  await mkdir(path.join(root, "recordings", name), { recursive: true });
  const post = (body: object) =>
    metaPost(new Request("http://h/m", { method: "POST", body: JSON.stringify(body) }), params({ name }));

  await Promise.all([post({ title: "Partie A" }), post({ archived: true })]);

  const stored = (await metaGet(new Request("http://h/m"), params({ name }))) as Response;
  expect(await stored.json()).toEqual({ title: "Partie A", archived: true });
});

/**
 * 6) `lib/ingest.ts:163` — ohne Rumpf entsteht die `.partial` nie. Eine erklaerte Datei mit 0
 * Bytes hat damit fuer immer `have: -1`, und `complete` verweigert die ganze Sitzung auf jedem
 * Versuch: das Handy laedt das Gigabyte daneben endlos neu hoch.
 */
test("api/ingest/session/[name]/complete: eine erklaerte 0-Byte-Datei blockiert die Sitzung nicht", async () => {
  const auth = { authorization: "Bearer t0ken" };
  const manifest = {
    sessionId: "20260901-000000",
    files: [{ path: "games/g.json", bytes: 0 }],
  };
  const declared = await declarePost(
    new Request("http://h/d", { method: "POST", headers: auth, body: JSON.stringify(manifest) }),
  );
  const { name } = (await declared.json()) as { name: string };

  const chunk = await chunkPut(
    new Request(`http://h/c?path=games/g.json&offset=0`, { method: "PUT", headers: auth }),
    params({ name }),
  );
  expect(await chunk.json()).toEqual({ have: 0 });

  const sealed = await completePost(new Request("http://h/x", { method: "POST", headers: auth }), params({ name }));
  expect(sealed.status).toBe(200);
  expect(await readFile(path.join(root, "recordings", name, "files", "games", "g.json"), "utf8")).toBe("");
});

/**
 * 7) `app/api/ingest/jobs/route.ts:9` — `jobs()` wirft auf einer unlesbaren `jobs.jsonl`, und
 * zwar mit Absicht ("erfolgsfoermige Leere"). Ohne Fang wurde daraus eine nackte 500 ohne
 * Rumpf: die Transfers-Seite pollt, `.json()` wirft, der Nutzer sieht nichts.
 */
test("api/ingest/jobs: ein unlesbares Ledger wird mit seinem Grund gemeldet", async () => {
  await mkdir(path.join(root, "inbox", "jobs.jsonl"), { recursive: true });
  const { GET } = await import("@/app/api/ingest/jobs/route");

  const answer = await GET();

  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/EISDIR|jobs.jsonl/);
});

/**
 * 8) `lib/useless.ts:56` — lesen-aendern-schreiben ohne Riegel. Ein Widerruf, der neben dem
 * Setzen laeuft, sieht noch die leere Datei, schreibt nichts und meldet trotzdem 200.
 */
test("api/useless/[name]: ein Widerruf neben dem Setzen faellt nicht lautlos aus", async () => {
  const name = "rg-2026-09-01-00-00-00";
  await mkdir(path.join(root, "recordings", name), { recursive: true });
  const { POST } = await import("@/app/api/useless/[name]/route");
  const press = (useless: boolean) =>
    POST(new Request("http://h/u", { method: "POST", body: JSON.stringify({ useless }) }), params({ name }));

  await Promise.all([press(true), press(false)]);

  const flag = JSON.parse(await readFile(path.join(root, "recordings", name, "useless.json"), "utf8"));
  expect(flag.undone_at, "der zweite Druck hat die Datei des ersten nie gesehen").toBeTruthy();
});
