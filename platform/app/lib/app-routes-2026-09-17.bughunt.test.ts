/** Fehler, die als Nicht-Befund zurueckkamen — die 404/500-Regel von `api/cell` an drei weiteren Tueren. */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const crops = vi.hoisted(() => ({ mattePng: vi.fn() }));
vi.mock("@/lib/session-store/crops", () => ({ mattePng: crops.mattePng, CUT_MIME: "image/jpeg" }));

const fix = vi.hoisted(() => ({ saveFixedAlpha: vi.fn(), clearAlpha: vi.fn(), recutMatte: vi.fn() }));
vi.mock("@/lib/chain/matte-edit", () => fix);

const { GET: matteGet, POST: mattePost } = await import("@/app/api/matte/[name]/[stem]/route");
const { GET: hello } = await import("@/app/api/ingest/hello/route");

const params = { params: Promise.resolve({ name: "rg-1", stem: "000123" }) };
const errno = (code: string, message: string) => Object.assign(new Error(message), { code });

beforeEach(() => vi.clearAllMocks());

describe("GET /api/matte/[name]/[stem]", () => {
  test("ein fehlendes Alpha ist 404", async () => {
    crops.mattePng.mockRejectedValueOnce(errno("ENOENT", "no mattes/000123.webp"));
    expect((await matteGet(new Request("http://x/"), params)).status).toBe(404);
  });

  test("ein KAPUTTES Alpha ist unser Fehler, nicht ein fehlendes", async () => {
    crops.mattePng.mockRejectedValueOnce(new Error("Input buffer contains unsupported image format"));
    const res = await matteGet(new Request("http://x/"), params);
    expect(res.status, "BUG: ein unlesbares Alpha liest sich als 'kein Alpha da'").toBe(500);
    expect(await res.text()).toContain("unsupported image format");
  });
});

describe("POST /api/matte/[name]/[stem]", () => {
  test("eine unbrauchbare Maske ist 400", async () => {
    const res = await mattePost(new Request("http://x/", { method: "POST", body: JSON.stringify({ mask: 7 }) }), params);
    expect(res.status).toBe(400);
  });

  test("ein gescheiterter SCHREIBVORGANG wird nicht der Maske angelastet", async () => {
    fix.saveFixedAlpha.mockRejectedValueOnce(errno("EACCES", "permission denied, open 'mattes/000123.fixed.webp'"));
    const body = JSON.stringify({ mask: Buffer.from("pixels").toString("base64") });
    const res = await mattePost(new Request("http://x/", { method: "POST", body }), params);
    expect(res.status, "BUG: der Stift meldet 'deine Maske taugt nichts', obwohl die Platte zu ist").toBe(500);
    expect((await res.json()).error).toContain("permission denied");
  });
});

describe("GET /api/ingest/hello", () => {
  beforeEach(async () => {
    await tempDataRoot("hello-bughunt");
    delete process.env.CHESSLAB_INGEST_TOKEN;
  });
  afterEach(() => {
    process.env.CHESSLAB_DATA_DIR = process.env.CHESSLAB_DATA_DIR ?? "";
  });

  test("das Erkennungszeichen steht auch dann, wenn der Token nicht zu holen ist", async () => {
    delete process.env.CHESSLAB_DATA_DIR;
    // Das Handy schickt immer `Bearer …`; ohne Kopfzeile kaeme `authorized` am Token vorbei.
    const res = await hello(new Request("http://host/api/ingest/hello", {
      headers: { authorization: "Bearer whatever" },
    }));
    expect(res.status, "BUG: der Scanner bekommt Next' HTML-500 und kann diesen Rechner nicht erkennen").toBe(200);
    const body = await res.json();
    expect(body.app).toBe("chesslab-platform");
    expect(body.paired).toBe(false);
    expect(body.error, "warum ungepaart, gehoert in die Antwort").toContain("CHESSLAB_DATA_DIR");
  });
});
