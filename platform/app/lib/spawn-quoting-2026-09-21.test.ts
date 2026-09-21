/**
 * `windowsVerbatimArguments` reicht die Zeile unveraendert an CreateProcess — das Quoting ist
 * unseres. Diese Pfade liegen unter einem Verzeichnis, das ein Nutzer jederzeit in eines mit
 * Leerzeichen umbenennt, und dann bricht die Zeile an genau dieser Stelle auseinander.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, vi } from "vitest";
import { spawnTool } from "@/lib/jobs";
import { tempDataRoot } from "@/lib/test-fixtures";

const win = process.platform === "win32";

test.runIf(win)("ein Leerzeichen im Pfad UND im Argument ueberlebt den Weg durch cmd", async () => {
  const root = path.join(await tempDataRoot("spawn quote"), "with space");
  await mkdir(root, { recursive: true });
  const bat = path.join(root, "echo.bat");
  await writeFile(bat, "@echo off\r\n> \"%~1\" echo %~2\r\n", "utf8");
  const out = path.join(root, "out file.txt");

  spawnTool(bat, [out, "hallo welt"], root);

  await vi.waitFor(async () => expect((await readFile(out, "utf8")).trim()).toBe("hallo welt"), { timeout: 15_000 });
}, 30_000);
