import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { GET as chainGet } from "@/app/api/chain/[name]/route";
import { POST as confirmPost } from "@/app/api/confirm/[name]/route";
import { POST as recutPost } from "@/app/api/matte/[name]/route";
import { POST as pgnPost } from "@/app/api/pgn/[name]/route";
import { setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const ctx = (name: string) => ({ params: Promise.resolve({ name }) });

afterEach(async () => {
  await stopPyWorker();
  setPyWorkerCommand(null);
});

test("matte recut: ein ungueltiger URL-Name bleibt ein 400-Requestfehler", async () => {
  const response = await recutPost(
    new Request("http://x/api/matte/bad%2Fname", { method: "POST", body: '{"recut":true}' }),
    ctx("bad/name"),
  );

  expect(response.status, "BUG: die neue pauschale catch-Klausel macht checkName zu 500").toBe(400);
});

test("chain GET: ein PyOpFailed durch kaputtes log.jsonl ist 500", async () => {
  const root = await tempDataRoot("qa-r3-chain-op");
  const dir = await writeSession({ root, name: "g" });
  await rm(path.join(dir, "log.jsonl"));
  await mkdir(path.join(dir, "log.jsonl"));

  const response = await chainGet(new Request("http://x/api/chain/g"), ctx("g"));

  expect(response.status, "BUG: ein Python-I/O-Fehler wird als Clientfehler gemeldet").toBe(500);
});

test("chain GET: ein PyWorkerDown ist 500", async () => {
  const root = await tempDataRoot("qa-r3-chain-down");
  await writeSession({ root, name: "g" });
  await stopPyWorker();
  setPyWorkerCommand({ command: path.join(root, "gibt-es-nicht.exe"), args: [] });

  const response = await chainGet(new Request("http://x/api/chain/g"), ctx("g"));

  expect(response.status, "BUG: auch ein nicht startbarer Worker wird als HTTP 400 gemeldet").toBe(500);
});

test("confirm POST: ein PyOpFailed durch unlesbares candidate.json ist 500", async () => {
  const root = await tempDataRoot("qa-r3-confirm-op");
  const dir = path.join(root, "recordings", "g");
  await mkdir(path.join(dir, "candidate.json"), { recursive: true });

  const response = await confirmPost(
    new Request("http://x/api/confirm/g", { method: "POST", body: '{"kept":[]}' }),
    ctx("g"),
  );

  expect(response.status, "BUG: IsADirectoryError aus confirm wird zu HTTP 400").toBe(500);
});

test("pgn POST: ein betrieblicher PyOpFailed ist 500", async () => {
  const root = await tempDataRoot("qa-r3-pgn-op");
  await mkdir(path.join(root, "recordings", "g"), { recursive: true });
  const reply = [
    'process.stdin.setEncoding("utf8"); let b="";',
    'process.stdin.on("data", c => { b += c; let i;',
    'while ((i = b.indexOf("\\n")) >= 0) { const s=b.slice(0,i); b=b.slice(i+1);',
    'if (!s) continue; const q=JSON.parse(s);',
    'process.stdout.write(JSON.stringify({id:q.id,ok:false,kind:"OSError",error:"disk kaputt"})+"\\n"); }});',
  ].join("");
  await stopPyWorker();
  setPyWorkerCommand({ command: process.execPath, args: ["-e", reply] });

  const response = await pgnPost(
    new Request("http://x/api/pgn/g", { method: "POST", body: "1. e4 e5" }),
    ctx("g"),
  );

  expect(response.status, "BUG: PyOpFailed wird unabhaengig von seiner Art zu HTTP 400").toBe(500);
});
