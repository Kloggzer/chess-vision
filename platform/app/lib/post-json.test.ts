import { afterEach, expect, test, vi } from "vitest";
import { postJson } from "@/lib/answer";

/** Die sechs Kopien, die `postJson` abgeloest hat, Zeichen fuer Zeichen — die Referenz der Paritaet. */
async function legacyPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
  return answer;
}

type Seen = { url: string; init: RequestInit };

function wire(ok: boolean, body: unknown, statusText = "Bad Request"): Seen[] {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    return { ok, statusText, json: () => Promise.resolve(body) } as unknown as Response;
  });
  return seen;
}

const settle = (p: Promise<unknown>) => p.then((v) => ({ v }), (e: Error) => ({ e: e.message }));

afterEach(() => vi.unstubAllGlobals());

test.each([
  [true, { written: 3 }],
  [false, { error: "EACCES: corrections.jsonl" }],
  [false, {}],
])("postJson antwortet wie die alte Kopie (ok=%s, %j)", async (ok, body) => {
  const legacy = wire(ok, body, "Conflict");
  const before = await settle(legacyPost("/api/x", { a: [1, "b"] }));
  const now = wire(ok, body, "Conflict");
  const after = await settle(postJson("/api/x", { a: [1, "b"] }));
  expect(after).toEqual(before);
  expect(now).toEqual(legacy);
});

test("postJson schickt JSON mit Kopf und wirft den Grund der Route", async () => {
  const seen = wire(false, { error: "EISDIR" });
  await expect(postJson("/api/y", { k: 1 })).rejects.toThrow("EISDIR");
  expect(seen[0].init).toEqual({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: '{"k":1}',
  });
});
