import { rm } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { GET as boardGet } from "@/app/api/board/[name]/[stem]/route";
import { GET as cellGet } from "@/app/api/cell/[name]/[stem]/[square]/route";
import { POST as confirmPost } from "@/app/api/confirm/[name]/route";
import { GET as matteGet } from "@/app/api/matte/[name]/[stem]/route";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const cell = (name: string, stem = "000001") =>
  cellGet(new Request(`http://x/api/cell/${name}/${stem}/e4`), { params: Promise.resolve({ name, stem, square: "e4" }) });
const board = (name: string, stem = "000001") =>
  boardGet(new Request(`http://x/api/board/${name}/${stem}`), { params: Promise.resolve({ name, stem }) });

test("cell/board: fehlt intern candidate.json, ist das 500 und kein 'Aufnahme fehlt'", async () => {
  const root = await tempDataRoot("qa-offen-missing-cand");
  const dir = await writeSession({ root, name: "g", rows: [{ frame: 1 }] });
  await rm(path.join(dir, "candidate.json"));
  expect((await cell("g")).status, "BUG: ein interner FileNotFoundError wird 404").toBe(500);
  expect((await board("g")).status, "BUG: ein interner FileNotFoundError wird 404").toBe(500);
});

test("cell/board/matte: die angefragte Aufnahme oder der Frame fehlt, das bleibt 404", async () => {
  const root = await tempDataRoot("qa-offen-missing-watch");
  await writeSession({ root, name: "g", rows: [{ frame: 1 }] });
  expect((await cell("nirgends")).status).toBe(404);
  expect((await board("nirgends")).status).toBe(404);
  expect((await cell("g", "000999")).status, "ein unbekannter Stem ist 'nicht da'").toBe(404);
  const matte = await matteGet(new Request("http://x"), { params: Promise.resolve({ name: "g", stem: "000999" }) });
  expect(matte.status).toBe(404);
});

test("confirm: ein fehlender Kandidat der Aufnahme ist 404", async () => {
  await tempDataRoot("qa-offen-missing-confirm");
  const res = await confirmPost(new Request("http://x", { method: "POST", body: '{"kept":[]}' }),
    { params: Promise.resolve({ name: "g" }) });
  expect(res.status).toBe(404);
});
