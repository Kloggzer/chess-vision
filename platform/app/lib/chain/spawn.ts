/** Prozesse starten und beenden — ein Weg fuer `.bat` wie fuer `uv`, und Stopp trifft den ganzen Baum. */
import { spawn } from "node:child_process";
import { repoDir, uvBinary } from "@/lib/chain/cli-args";
import { killTree } from "@/lib/py/worker";

export { killTree };

/**
 * Windows quoting for one argument of a `cmd /s /c "..."` line: `windowsVerbatimArguments` hands the
 * string to CreateProcess untouched, and these are paths a user may rename to one with a space.
 */
const quoteArg = (value: string): string => (/[\s"^&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);

/** Node REFUSES `spawn("x.bat")` since 18.20 / 20.12 (CVE-2024-27980) with a SYNCHRONOUS EINVAL —
 *  jobs looked like they were working while none had started. */
export function spawnTool(binary: string, args: string[], cwd: string) {
  if (process.platform !== "win32" || !/\.(bat|cmd)$/i.test(binary)) {
    return spawn(binary, args, { cwd, windowsHide: true });
  }
  const line = [quoteArg(binary), ...args.map(quoteArg)].join(" ");
  return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `"${line}"`], {
    cwd,
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
}

export type ToolRun = { code: number; stdout: string; stderr: string; command: string };

/**
 * `uv run chesslab …` with stdout handed BACK, for the short verbs a request waits on — same binary,
 * same cwd, same `spawnTool`, NOT a second way to run Python. No timeout on purpose: killing a
 * half-rewritten manifest is worse than a slow request.
 */
export async function runChesslabCapture(args: string[]): Promise<ToolRun> {
  const binary = uvBinary();
  const argv = ["run", "chesslab", ...args];
  const command = `${binary} ${argv.join(" ")}`;
  return new Promise<ToolRun>((resolve) => {
    let stdout = "";
    let stderr = "";
    const child = spawnTool(binary, argv, repoDir());
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.on("error", (error) => resolve({ code: -1, stdout, stderr: error.message, command }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr, command }));
  });
}
