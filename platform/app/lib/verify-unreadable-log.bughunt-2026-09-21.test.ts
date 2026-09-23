/** Ein Lesefehler auf `log.jsonl` ist kein „nicht exportiert" — sonst fiele die Aufnahme lautlos aus `progress`. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "vitest";
import { loadVerifyStream } from "@/lib/label/verify";
import { sessionRow, tempDataRoot, writeSession } from "@/lib/test-fixtures";

const COVER = { a1: 0.9, b1: 0.8 };

async function withMatte(root: string, name: string) {
  const dir = path.join(root, "recordings", name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "matte.jsonl"),
    JSON.stringify({ frame: "000010", coverage: COVER, concepts: {} }) + "\n",
    "utf8",
  );
  return dir;
}

test("ein exportierter Log liefert den Frame — die Probe misst wirklich etwas", async () => {
  const root = await tempDataRoot("verify-ok");
  await writeSession({ root, name: "g", rows: [{ frame: 10, dirty: true }] });
  await withMatte(root, "g");
  const stream = await loadVerifyStream();
  expect(stream.progress.frames).toBe(1);
});

test("eine beschaedigte Zeile MITTENDRIN wird gemeldet, nicht als 'nicht exportiert' verschluckt", async () => {
  const root = await tempDataRoot("verify-corrupt");
  const dir = await writeSession({ root, name: "g", rows: [{ frame: 10, dirty: true }] });
  await withMatte(root, "g");
  const good = JSON.stringify(sessionRow({ frame: 10, dirty: true }));
  await writeFile(path.join(dir, "log.jsonl"), `${good}\n{ kaputt\n${good}\n`, "utf8");
  await expect(loadVerifyStream()).rejects.toThrow(/beschaedigte/);
});

test("ohne `clock.fps` schweigt die Lane nicht — die Sekunden waeren geraten", async () => {
  const root = await tempDataRoot("verify-fps");
  await writeSession({ root, name: "g", fps: null, rows: [{ frame: 10, dirty: true }] });
  await withMatte(root, "g");
  await expect(loadVerifyStream()).rejects.toThrow(/clock\.fps/);
});

test("eine Aufnahme ohne Log bleibt still — das ist der Schritt, den die Kette schuldet", async () => {
  const root = await tempDataRoot("verify-enoent");
  await withMatte(root, "g");
  const stream = await loadVerifyStream();
  expect(stream.progress.frames).toBe(0);
});
