// Getestet wird der TORWAERTER der Routen, nicht die Arbeit dahinter.
import { beforeEach, expect, test, vi } from "vitest";

const drain = vi.hoisted(() => ({
  started: [] as (string | null)[],
  fail: null as string | null,
  stopFail: null as string | null,
  status: { running: null as string | null },
}));
vi.mock("@/lib/chain/drain", () => ({
  drainStatus: async () => drain.status,
  startDrain: async (step: string | null) => {
    drain.started.push(step);
    return drain.fail === null ? { started: step } : { error: drain.fail };
  },
  stopDrain: async () => (drain.stopFail === null ? { stopped: true } : { error: drain.stopFail }),
}));

const matte = vi.hoisted(() => ({ recut: [] as string[], clears: [] as string[], restores: [] as string[] }));
vi.mock("@/lib/session-store/matte-fix", () => ({
  recutMatte: async (name: string) => {
    matte.recut.push(name);
    return { name, cut: 3 };
  },
  clearAlpha: async (name: string, stem: string) => {
    matte.clears.push(`${name}|${stem}`);
    return true;
  },
  restoreAlpha: async (name: string, stem: string) => {
    matte.restores.push(`${name}|${stem}`);
    return true;
  },
  saveFixedAlpha: async () => true,
}));

const { GET: drainGet, POST: drainPost } = await import("@/app/api/drain/route");
const { POST: recutPost } = await import("@/app/api/matte/[name]/route");
const { POST: strokePost } = await import("@/app/api/matte/[name]/[stem]/route");

beforeEach(() => {
  drain.started = [];
  drain.fail = null;
  drain.stopFail = null;
  drain.status = { running: null };
  matte.recut = [];
  matte.clears = [];
  matte.restores = [];
});

const params = <T>(value: T) => ({ params: Promise.resolve(value) });
const post = (body: unknown) =>
  new Request("http://x/api/drain", { method: "POST", body: JSON.stringify(body) });

test("`chain` ist ein Schritt, ein erfundener Name nicht", async () => {
  expect((await drainPost(post({ step: "chain" }))).status).toBe(200);
  expect(drain.started).toEqual(["chain"]);

  const bad = await drainPost(post({ step: "kette" }));
  expect(bad.status).toBe(400);
  expect(drain.started, "ein unbekannter Schritt darf nichts starten").toEqual(["chain"]);
});

test("ein Rumpf ohne Schritt startet nichts", async () => {
  // Kein `step` heisst nicht "nimm die Kette": der Knopf sagt, was er meint.
  expect((await drainPost(post({}))).status).toBe(400);
  expect(drain.started).toEqual([]);
});

test("ein laufender Drain gibt 409 zurueck, keinen stillen Erfolg", async () => {
  drain.fail = "es laeuft schon einer";
  const res = await drainPost(post({ step: "matte" }));
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: "es laeuft schon einer" });
});

test("stop meldet 409, wenn gar keiner laeuft", async () => {
  drain.stopFail = "es laeuft keiner";
  expect((await drainPost(post({ stop: true }))).status).toBe(409);
  expect(drain.started, "ein Stopp darf nie etwas starten").toEqual([]);
});

test("GET liefert den Stand, den das Schritt-Panel liest", async () => {
  drain.status = { running: "matte" };
  expect(await (await drainGet()).json()).toEqual({ running: "matte" });
});

test("der Schnitt braucht ein ausdrueckliches {recut:true}", async () => {
  const ok = await recutPost(new Request("http://x", { method: "POST", body: '{"recut":true}' }),
    params({ name: "2026-08-13-12-10-55" }));
  expect(ok.status).toBe(200);
  expect(matte.recut).toEqual(["2026-08-13-12-10-55"]);

  for (const body of ["{}", '{"recut":false}', "kein json"]) {
    const res = await recutPost(new Request("http://x", { method: "POST", body }),
      params({ name: "2026-08-13-12-10-55" }));
    expect(res.status, body).toBe(400);
  }
  expect(matte.recut, "nur der ausdrueckliche Rumpf schneidet").toHaveLength(1);
});

test("der Stift sagt `recut: false` — die Zahlen bleiben SAMs", async () => {
  const res = await strokePost(
    new Request("http://x", { method: "POST", body: '{"clear":true}' }),
    params({ name: "2026-08-13-12-10-55", stem: "000010" }));

  expect(await res.json()).toEqual({ written: true, recut: false });
  expect(matte.clears).toEqual(["2026-08-13-12-10-55|000010"]);
});

test("eine Maske, die keine ist, wird abgelehnt", async () => {
  for (const body of ['{"mask":7}', '{"mask":""}', "{}"]) {
    const res = await strokePost(new Request("http://x", { method: "POST", body }),
      params({ name: "2026-08-13-12-10-55", stem: "000010" }));
    expect(res.status, body).toBe(400);
  }
});

/** Ohne Rueckweg war eine versehentlich abgeschickte Seite endgueltig (Nutzer, 2026-09-17). */
test("`restore` nimmt das geleerte Alpha zurueck und laesst `clear` in Ruhe", async () => {
  const res = await strokePost(
    new Request("http://x", { method: "POST", body: '{"restore":true}' }),
    params({ name: "2026-08-13-12-10-55", stem: "000010" }));

  expect(await res.json()).toEqual({ written: true, recut: false });
  expect(matte.restores).toEqual(["2026-08-13-12-10-55|000010"]);
  expect(matte.clears, "restore darf nicht auch noch leeren").toEqual([]);
});
