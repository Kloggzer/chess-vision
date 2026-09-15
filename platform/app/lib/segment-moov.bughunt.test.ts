/**
 * Eine Aufnahme ist elf Dateien, geprüft wird eine.
 *
 * `Recording` (Python, `recording.py:22`) liest `video.mp4` UND jedes `video-NNN.mp4` daneben als
 * einen Strom. `chainState` ruft `checkMp4` aber nur auf dem Kopf: ein Teil in der Mitte ohne
 * `moov` bleibt unsichtbar, und der Export endet dort still. Genau dieser Ausfall ist belegt —
 * vier von elf Aufnahmen am 2026-08-13, 1,99 GB. Gefunden an einer 11-teiligen Aufnahme, 2026-09-15.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test } from "vitest";
import { chainState } from "@/lib/chain";
import { tempDataRoot } from "@/lib/test-fixtures";

const NAME = "rec-mehrteilig";

/** `ftyp` + `mdat`, und `moov` nur, wenn der Recorder sich schliessen durfte. */
function mp4(finalized: boolean): Buffer {
  const box = (type: string, payload = 0) => {
    const b = Buffer.alloc(8 + payload);
    b.writeUInt32BE(8 + payload, 0);
    b.write(type, 4, "latin1");
    return b;
  };
  return Buffer.concat([box("ftyp", 8), box("mdat", 32), ...(finalized ? [box("moov", 8)] : [])]);
}

let sessionDir: string;

beforeEach(async () => {
  const root = await tempDataRoot("segment-moov");
  sessionDir = path.join(root, "recordings", NAME, "files", "sessions", "20260915-165444");
  await mkdir(sessionDir, { recursive: true });
});

async function parts(...finalized: boolean[]) {
  await writeFile(path.join(sessionDir, "video.mp4"), mp4(finalized[0]));
  for (let i = 1; i < finalized.length; i++) {
    await writeFile(path.join(sessionDir, `video-${String(i).padStart(3, "0")}.mp4`), mp4(finalized[i]));
  }
}

test("ein Teil in der Mitte ohne Index macht die Aufnahme kaputt, nicht nur der Kopf", async () => {
  await parts(true, true, false, true);

  const state = await chainState(NAME);

  expect(state.videoBroken).not.toBeNull();
  expect(state.videoBroken).toMatch(/video-002/);
});

test("alle Teile vollstaendig heisst vollstaendig", async () => {
  await parts(true, true, true);

  expect((await chainState(NAME)).videoBroken).toBeNull();
});

test("der Kopf allein wird weiterhin richtig beurteilt", async () => {
  await parts(false);

  expect((await chainState(NAME)).videoBroken).not.toBeNull();
});
