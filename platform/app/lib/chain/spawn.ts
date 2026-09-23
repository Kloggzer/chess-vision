/** Prozesse starten und beenden — ein Weg fuer `.bat` wie fuer `uv`, und Stopp trifft den ganzen Baum. */
import { spawn } from "node:child_process";
import { repoDir, uvBinary } from "@/lib/chain/cli-args";

/**
 * Windows quoting for one argument of a `cmd /s /c "..."` line: `windowsVerbatimArguments` hands the
 * string to CreateProcess untouched, and these are paths a user may rename to one with a space.
 */
const quoteArg = (value: string): string => (/[\s"^&|<>]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value);

/**
 * Spawn a tool, including a Windows `.bat`. Node REFUSES `spawn("x.bat")` since 18.20 / 20.12
 * (CVE-2024-27980) with a SYNCHRONOUS EINVAL — on 2026-08-13 not one pack or label job had ever
 * started, while every one of them looked like it was working.
 */
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

/**
 * Kill the whole tree, not our child: the chain is `uv` → `chesslab.exe` → python, so a `.kill()`
 * on the shim leaves the worker on the GPU — measured 2026-08-19, three SAM 3 processes at once.
 */
export function killTree(pid: number): Promise<void> {
  if (process.platform !== "win32") {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* already gone */
    }
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const killer = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true });
    killer.on("error", () => resolve());
    killer.on("close", () => resolve());
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
