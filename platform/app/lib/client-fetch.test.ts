/** Drei Client-Seiten riefen `fetch` ohne Fang: ein abgerissenes Netz liess die Confirm-Seite auf
 *  "writing" stehen. Seit 2026-09-26 geht jeder Client-Abruf durch `fetchJson` (lib/answer.ts). */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { fetchJson } from "@/lib/answer";
import { confirmState } from "@/lib/label/confirm-kept";

const ROOT = path.join(__dirname, "..");

afterEach(() => vi.unstubAllGlobals());

const offline = () => vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));

/** `confirm()` aus app/confirm/[name]/cards.tsx vor dem Fix, mit `setState` als Rekorder. */
async function legacyConfirm(setState: (s: string) => void) {
  setState("writing");
  const res = await fetch(`/api/confirm/x`, { method: "POST", body: "{}" });
  const body = await res.json();
  setState(res.ok ? `confirmed — ${body.reviewed_plies.length} reviewed plies` : `error: ${body.error}`);
}

test("der alte Pfad bleibt ohne Netz auf 'writing' stehen", async () => {
  offline();
  const states: string[] = [];
  await expect(legacyConfirm((s) => states.push(s))).rejects.toThrow("Failed to fetch");
  expect(states).toEqual(["writing"]);
});

test("confirmState endet ohne Netz in einem Fehlerzustand", async () => {
  offline();
  expect(await confirmState(fetchJson("/api/confirm/x", { method: "POST" }))).toBe("error: Failed to fetch");
});

test("confirmState liest Absage und Erfolg wie zuvor", async () => {
  const wire = (ok: boolean, body: unknown) =>
    vi.stubGlobal("fetch", () => Promise.resolve({ ok, statusText: "Conflict", json: () => Promise.resolve(body) }));
  wire(false, { error: "reference.pgn ersetzt" });
  expect(await confirmState(fetchJson("/api/confirm/x"))).toBe("error: reference.pgn ersetzt");
  wire(true, { reviewed_plies: [1, 2, 3] });
  expect(await confirmState(fetchJson("/api/confirm/x"))).toBe("confirmed — 3 reviewed plies");
});

async function sources(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await sources(full)));
    else if (/\.tsx?$/.test(e.name) && !e.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

/** `fetch(` als Aufruf, nicht `fetchJson(` oder `prefetch(`. */
const RAW_FETCH = /(?<![\w.])fetch\(/;

test("app/ und components/ rufen fetch nur ueber lib/answer.ts", async () => {
  const hits: string[] = [];
  for (const dir of ["app", "components"]) {
    for (const file of await sources(path.join(ROOT, dir))) {
      if (RAW_FETCH.test(await readFile(file, "utf8"))) hits.push(path.relative(ROOT, file).split(path.sep).join("/"));
    }
  }
  expect(hits, "nimm fetchJson/postJson — ein nackter Abruf faengt kein abgerissenes Netz").toEqual([]);
});

test("die Ratsche faellt auf die eingepflanzte Form", () => {
  expect(RAW_FETCH.test(`void fetch("/api/drain").then(r)`)).toBe(true);
  expect(RAW_FETCH.test(`await fetchJson("/api/x"); router.prefetch("/y"); window.fetch`)).toBe(false);
});
