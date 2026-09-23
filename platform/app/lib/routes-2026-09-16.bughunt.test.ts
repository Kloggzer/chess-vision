import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { parseCost } from "@/lib/session-delete";
import { tempDataRoot } from "@/lib/test-fixtures";

// Routen-Jagd 2026-09-16: jeder Test haengt an einer Route, die bis dahin in `route-coverage.txt` stand.

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

// Eine Kostenzeile ohne `frames`/`crops` versprach "0 Frames, 0 Crops" fuer eine Loeschung, die alles nimmt.
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

// `?min=` ist leer, nicht null: `Number("")` ist 0, und die Klassenwand liess stumm alles durch.
test("api/query: ein leeres min ist kein gemessenes null", async () => {
  const answer = await queryGet(new Request("http://h/api/query?min="));
  const body = (await answer.json()) as { filter?: { min: number }; error?: string };

  expect(body.filter?.min).toBe(0.9);
});

test("api/query: eine unbekannte Phase wird abgelehnt, nicht mit 0 Treffern beantwortet", async () => {
  const answer = await queryGet(new Request("http://h/api/query?class=wP&min=0.9&phase=settle"));

  expect(answer.status).toBe(400);
});

test("api/zuege/[name]/note: ein fehlender ply wird nicht zu ply 0", async () => {
  const answer = await notePost(
    new Request("http://h/n", { method: "POST", body: JSON.stringify({ ply: null, reason: "x" }) }),
    params({ name: "rg-2026-09-01-00-00-00" }),
  );

  expect(answer.status).toBe(400);
});

test("api/meta/[name]: zwei gleichzeitige Schreiber verlieren einander nicht", async () => {
  const name = "rg-2026-09-01-00-00-00";
  await mkdir(path.join(root, "recordings", name), { recursive: true });
  const post = (body: object) =>
    metaPost(new Request("http://h/m", { method: "POST", body: JSON.stringify(body) }), params({ name }));

  await Promise.all([post({ title: "Partie A" }), post({ archived: true })]);

  const stored = (await metaGet(new Request("http://h/m"), params({ name }))) as Response;
  expect(await stored.json()).toEqual({ title: "Partie A", archived: true });
});

// Ohne Rumpf entstand die `.partial` nie: `have: -1` fuer immer, und das Handy lud die Sitzung endlos neu.
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

// `jobs()` wirft mit Absicht; ohne Fang war es eine nackte 500 ohne Rumpf, die Transfers-Seite sah nichts.
test("api/ingest/jobs: ein unlesbares Ledger wird mit seinem Grund gemeldet", async () => {
  await mkdir(path.join(root, "inbox", "jobs.jsonl"), { recursive: true });
  const { GET } = await import("@/app/api/ingest/jobs/route");

  const answer = await GET();

  expect(answer.status).toBe(500);
  expect((await answer.json()).error).toMatch(/EISDIR|jobs.jsonl/);
});

// Nacheinander, nicht per `Promise.all`: die Reihenfolge in `serialize` waehlt der Scheduler (war flaky).
test("api/useless/[name]: der Widerruf sieht das Setzen, und ins Leere meldet er null", async () => {
  const name = "rg-2026-09-01-00-00-00";
  await mkdir(path.join(root, "recordings", name), { recursive: true });
  const { POST } = await import("@/app/api/useless/[name]/route");
  const press = (useless: boolean) =>
    POST(new Request("http://h/u", { method: "POST", body: JSON.stringify({ useless }) }), params({ name }));

  const empty = await (await press(false)).json();
  expect(empty.flag, "ohne gesetzte Datei gibt es nichts zu widerrufen").toBeNull();

  await press(true);
  await press(false);

  const flag = JSON.parse(await readFile(path.join(root, "recordings", name, "useless.json"), "utf8"));
  expect(flag.undone_at, "der Widerruf hat die Datei des Setzens nie gesehen").toBeTruthy();
});