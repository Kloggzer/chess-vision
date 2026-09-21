/**
 * Zwei Faelle mit einem ECHTEN Prozess: Stopp muss als Entscheidung im Ledger stehen (nicht als
 * Werkzeugfehler), und ein Label-Lauf, der mit 0 endet OHNE `candidate.json` geschrieben zu haben,
 * darf nicht `done` melden — genau die Form von Erfolg, den ein Job nicht hat.
 */
import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, expect, test, vi } from "vitest";
import { enqueueChain, enqueueLabel, jobOf, stopRunning, whenIdle } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

let root: string;

/** Ein Werkzeug-Ersatz, der die Argumente ignoriert: `exit 0` oder ein Prozess, der nicht endet. */
async function shim(name: string, forever: boolean): Promise<string> {
  const node = process.execPath;
  const body = forever ? `"${node}" -e "setInterval(()=>{},1000)"` : "";
  const win = process.platform === "win32";
  const file = path.join(root, win ? `${name}.bat` : name);
  await writeFile(file, win ? `@echo off\n${body}\n` : `#!/bin/sh\n${body || ":"}\n`, "utf8");
  if (!win) await chmod(file, 0o755);
  return file;
}

beforeEach(async () => {
  root = await tempDataRoot("job-stopped");
  delete process.env.CHESSLAB_REPO_DIR;
});

test("ein gestoppter Lauf steht als Entscheidung im Ledger, nicht als Werkzeugfehler", async () => {
  process.env.CHESSLAB_UV = await shim("uv", true);
  const name = "2026-09-21-14-00-00";

  void enqueueChain(name, "export");
  await vi.waitFor(async () => expect(await stopRunning()).toMatchObject({ stopped: name }), { timeout: 15_000 });
  await whenIdle();

  const row = await jobOf(name);
  expect(row?.state).toBe("stopped");
  expect(row?.reason).toContain("gestoppt");
}, 30_000);

test("Exit 0 ohne candidate.json ist kein erledigter Schritt", async () => {
  process.env.CHESSLAB_DESKTOP_BIN = await shim("desktop", false);
  const name = "2026-09-21-15-00-00";
  // `desktopWorkDir()` haengt am Repo-Verzeichnis; ohne es scheitert der Spawn am fehlenden cwd.
  await mkdir(path.join(root, "android", "desktop"), { recursive: true });
  process.env.CHESSLAB_REPO_DIR = root;
  const session = path.join(root, "recordings", name, "files", "sessions", "20260921-150000");
  await mkdir(session, { recursive: true });
  await writeFile(path.join(session, "video.mp4"), "x");

  await enqueueLabel(name);
  await whenIdle();

  const row = await jobOf(name);
  expect(row?.code).toBe(0);
  expect(row?.state).toBe("failed");
  expect(row?.candidate).toBeUndefined();
}, 30_000);
