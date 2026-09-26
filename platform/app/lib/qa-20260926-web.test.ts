import { expect, test, vi } from "vitest";

const fake = vi.hoisted(() => ({ busy: false, load: vi.fn() }));
vi.mock("@/lib/chain/slot", async (original) => ({
  ...(await original<typeof import("@/lib/chain/slot")>()),
  busy: () => fake.busy,
}));
vi.mock("@/lib/label/verify", () => ({ loadVerifyStream: fake.load }));

const { POST: sessionPost } = await import("@/app/api/session/[id]/route");
const { GET: verifyGet } = await import("@/app/api/verify/route");

const post = (body: unknown) => new Request("http://x/api/session/rg-g", { method: "POST", body: JSON.stringify(body) });
const ctx = { params: Promise.resolve({ id: "rg-g" }) } as never;

test.each([{ dryRun: true }, { confirm: "rg-g" }])("api/session/[id]: ein laufender Job ist ein Konflikt (409), keine kaputte Anfrage", async (body) => {
  fake.busy = true;
  try {
    const res = await sessionPost(post(body), ctx);
    expect(res.status, "BUG: die Absage wegen des belegten Slots kommt als 400").toBe(409);
    expect((await res.json()).error).toBe("ein Job läuft gerade — der schreibt womöglich dieselben Manifeste");
  } finally {
    fake.busy = false;
  }
});

test("api/verify: Pythons `Missing` ist 404 wie ein ENOENT", async () => {
  fake.load.mockRejectedValueOnce(Object.assign(new Error("Missing: no frame 000001 in the log of g"), { kind: "Missing" }));
  const res = await verifyGet(new Request("http://x/api/verify"));
  expect(res.status, "BUG: die Route fuehrt eine eigene Regel neben `lib/http-error.ts`").toBe(404);
  expect((await res.json()).error).toMatch(/no frame 000001/);
});
