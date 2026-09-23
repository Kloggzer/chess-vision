/** `unexported` las JEDEN `stat`-Fehler am `log.jsonl` als „nie exportiert" und lieferte fremde Handy-Pixel. */
import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ boardPng: vi.fn(), storedBoardPng: vi.fn(), stat: vi.fn() }));

vi.mock("@/lib/session-store/crops", () => ({ boardPng: mocks.boardPng, CUT_MIME: "image/webp" }));
vi.mock("@/lib/session-store/stored", () => ({ storedBoardPng: mocks.storedBoardPng }));
vi.mock("node:fs/promises", async (original) => ({ ...(await original<object>()), stat: mocks.stat }));

import { GET } from "@/app/api/board/[name]/[stem]/route";
import { tempDataRoot } from "@/lib/test-fixtures";

beforeEach(async () => {
  vi.clearAllMocks();
  await tempDataRoot("boardroute");
  mocks.boardPng.mockRejectedValue(Object.assign(new Error("no board"), { code: "ENOENT" }));
  mocks.storedBoardPng.mockResolvedValue(Buffer.from("phone pixels"));
});

const get = () => GET(new Request("http://local/api/board/g/000001"), { params: Promise.resolve({ name: "g", stem: "000001" }) });

test("ein EACCES am log.jsonl ist kein unexportiertes Bundle", async () => {
  // Ablehnen, nicht werfen: ein synchroner Wurf liefe am `.then(_, griff)` vorbei.
  mocks.stat.mockRejectedValue(Object.assign(new Error("EACCES: log.jsonl"), { code: "EACCES" }));
  expect((await get()).status).toBe(500);
  expect(mocks.storedBoardPng).not.toHaveBeenCalled();
});

test("ohne log.jsonl faellt ein Bundle weiter auf sein Handy-JPEG zurueck", async () => {
  mocks.stat.mockRejectedValue(Object.assign(new Error("ENOENT: log.jsonl"), { code: "ENOENT" }));
  expect((await get()).status).toBe(200);
  expect(mocks.storedBoardPng).toHaveBeenCalledOnce();
});
