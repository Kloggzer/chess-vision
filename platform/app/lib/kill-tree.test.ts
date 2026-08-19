// Real processes: the bug was that `.kill()` on our own child left the worker on the GPU.
import { spawn } from "node:child_process";
import { expect, test, vi } from "vitest";
import { alive } from "@/lib/heavy-lock";
import { killTree } from "@/lib/jobs";

const FOREVER = "setInterval(()=>{},1000)";
const SPAWNER = [
  'const {spawn}=require("node:child_process");',
  `const c=spawn(process.execPath,["-e","${FOREVER}"],{stdio:"ignore"});`,
  "console.log(c.pid);",
  FOREVER,
].join("");

test("the kill reaches the GRANDchild — uv → chesslab.exe → python is three deep", async () => {
  const parent = spawn(process.execPath, ["-e", SPAWNER], { stdio: ["ignore", "pipe", "ignore"] });
  const grandchild = await new Promise<number>((resolve) => {
    parent.stdout.on("data", (chunk) => resolve(Number(String(chunk).trim())));
  });
  expect(alive(parent.pid!)).toBe(true);
  expect(alive(grandchild)).toBe(true);

  await killTree(parent.pid!);

  await vi.waitFor(
    () => {
      expect(alive(parent.pid!)).toBe(false);
      expect(alive(grandchild)).toBe(false);
    },
    { timeout: 15_000 },
  );
}, 30_000);
