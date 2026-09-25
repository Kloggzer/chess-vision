import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { tempDataRoot } from "@/lib/test-fixtures";

const disk = vi.hoisted(() => ({ unreadable: "" }));
vi.mock("node:fs/promises", async (original) => {
  const real = await original<typeof import("node:fs/promises")>();
  return {
    ...real,
    readFile: (file: Parameters<typeof real.readFile>[0], ...rest: unknown[]) => {
      if (disk.unreadable && String(file).endsWith(disk.unreadable)) {
        return Promise.reject(Object.assign(new Error(`EACCES: ${file}`), { code: "EACCES" }));
      }
      return (real.readFile as (...args: unknown[]) => unknown)(file, ...rest);
    },
  };
});

const edit = vi.hoisted(() => ({
  clearAlpha: vi.fn(),
  recutMatte: vi.fn(),
  restoreAlpha: vi.fn(),
  saveFixedAlpha: vi.fn(),
}));
vi.mock("@/lib/chain/matte-edit", () => edit);

const { POST: recutPost } = await import("@/app/api/matte/[name]/route");
const { POST: strokePost } = await import("@/app/api/matte/[name]/[stem]/route");
const { phoneSessionSeconds } = await import("@/lib/session-store/stored");

beforeEach(() => {
  disk.unreadable = "";
  vi.clearAllMocks();
});

test("stored duration: EACCES am neuesten session.yaml ist nicht 'keine Dauer'", async () => {
  const root = await tempDataRoot("qa-r2-stored");
  const sessions = path.join(root, "recordings", "g", "files", "sessions");
  await mkdir(path.join(sessions, "a-old"), { recursive: true });
  await mkdir(path.join(sessions, "z-new"), { recursive: true });
  await writeFile(path.join(sessions, "a-old", "session.yaml"), "video_duration_ns: 1000000000\n", "utf8");
  await writeFile(path.join(sessions, "z-new", "session.yaml"), "video_duration_ns: 2000000000\n", "utf8");
  disk.unreadable = path.join("z-new", "session.yaml");

  await expect(phoneSessionSeconds("g"), "BUG: EACCES wird verschluckt und die alte Dauer geliefert")
    .rejects.toThrow(/EACCES/);
});

test("matte recut: ein Betriebsfehler ist 500, nicht ein Fehler des Request-Bodys", async () => {
  edit.recutMatte.mockRejectedValueOnce(Object.assign(new Error("EACCES: matte.jsonl"), { code: "EACCES" }));
  const response = await recutPost(
    new Request("http://x/api/matte/g", { method: "POST", body: '{"recut":true}' }),
    { params: Promise.resolve({ name: "g" }) },
  );

  expect(response.status, "BUG: die Route legt auch Platten-/Prozessfehler dem Client als 400 aus").toBe(500);
});

test("matte stroke: base64-Daten muessen wirklich ein PNG sein", async () => {
  edit.saveFixedAlpha.mockResolvedValueOnce("mattes/000001.fixed.webp");
  const response = await strokePost(
    new Request("http://x/api/matte/g/000001", {
      method: "POST",
      body: JSON.stringify({ mask: Buffer.from("kein PNG").toString("base64") }),
    }),
    { params: Promise.resolve({ name: "g", stem: "000001" }) },
  );

  expect(response.status, "BUG: beliebige Bytes passieren die dokumentierte base64-PNG-Grenze").toBe(400);
  expect(edit.saveFixedAlpha).not.toHaveBeenCalled();
});
