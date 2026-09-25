import path from "node:path";
import { afterEach, expect, test } from "vitest";
import { GET as cellGet } from "@/app/api/cell/[name]/[stem]/[square]/route";
import { POST as chainPost } from "@/app/api/chain/[name]/route";
import { POST as confirmPost } from "@/app/api/confirm/[name]/route";
import { GET as drainGet } from "@/app/api/drain/route";
import { POST as uselessPost } from "@/app/api/useless/[name]/route";
import { POST as zuegePost } from "@/app/api/zuege/[name]/route";
import { setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const ctx = (name: string) => ({ params: Promise.resolve({ name }) });
const post = (url: string, body: string) => new Request(url, { method: "POST", body });

afterEach(async () => {
  await stopPyWorker();
  setPyWorkerCommand(null);
});

async function pythonRefuses(kind: string): Promise<void> {
  const reply = [
    'process.stdin.setEncoding("utf8"); let b="";',
    'process.stdin.on("data", c => { b += c; let i;',
    'while ((i = b.indexOf("\\n")) >= 0) { const s=b.slice(0,i); b=b.slice(i+1);',
    "if (!s) continue; const q=JSON.parse(s);",
    `process.stdout.write(JSON.stringify({id:q.id,ok:false,kind:${JSON.stringify(kind)},error:"x"})+"\\n"); }});`,
  ].join("");
  await stopPyWorker();
  setPyWorkerCommand({ command: process.execPath, args: ["-e", reply] });
}

async function pythonDown(root: string): Promise<void> {
  await stopPyWorker();
  setPyWorkerCommand({ command: path.join(root, "gibt-es-nicht.exe"), args: [] });
}

test("zuege commit: ein betrieblicher PyOpFailed ist 500", async () => {
  await writeSession({ root: await tempDataRoot("qa-r3-zuege-op"), name: "g" });
  await pythonRefuses("OSError");
  const res = await zuegePost(post("http://x/api/zuege/g", '{"action":"commit","kept":[]}'), ctx("g"));
  expect(res.status, "BUG: Python-I/O-Fehler als Clientfehler").toBe(500);
});

test("zuege commit: ein bestrittenes Urteil ist 409, kein 400", async () => {
  await writeSession({ root: await tempDataRoot("qa-r3-zuege-contested"), name: "g" });
  await pythonRefuses("VerdictContested");
  const res = await zuegePost(post("http://x/api/zuege/g", '{"action":"commit","kept":[]}'), ctx("g"));
  expect(res.status).toBe(409);
});

test("confirm: ein bestrittenes Urteil ist 409 wie jeder Stempel-Konflikt", async () => {
  await writeSession({ root: await tempDataRoot("qa-r3-confirm-contested"), name: "g" });
  await pythonRefuses("VerdictContested");
  const res = await confirmPost(post("http://x/api/confirm/g", '{"kept":[]}'), ctx("g"));
  expect(res.status).toBe(409);
});

test("confirm: ein Rumpf ohne JSON bleibt 400", async () => {
  await writeSession({ root: await tempDataRoot("qa-r3-confirm-body"), name: "g" });
  const res = await confirmPost(post("http://x/api/confirm/g", "{kaputt"), ctx("g"));
  expect(res.status).toBe(400);
});

test("chain POST: ein nicht startbarer Worker ist 500", async () => {
  const root = await tempDataRoot("qa-r3-chain-post");
  await writeSession({ root, name: "g" });
  await pythonDown(root);
  const res = await chainPost(post("http://x/api/chain/g", '{"step":"export"}'), ctx("g") as never);
  expect(res.status, "BUG: PyWorkerDown als HTTP 400").toBe(500);
});

test("chain POST: ein ungueltiger Name bleibt 400", async () => {
  await tempDataRoot("qa-r3-chain-name");
  const res = await chainPost(post("http://x/api/chain/x", '{"step":"export"}'), ctx("bad/name") as never);
  expect(res.status).toBe(400);
});

test("drain GET: ein betrieblicher PyOpFailed ist 500", async () => {
  const root = await tempDataRoot("qa-r3-drain");
  await writeSession({ root, name: "g" });
  await pythonRefuses("OSError");
  const res = await drainGet();
  expect(res.status, "BUG: der Backlog-Fehler als Clientfehler").toBe(500);
});

test("useless POST: scheitert der Kettenstand in Python, ist das 500", async () => {
  await writeSession({ root: await tempDataRoot("qa-r3-useless-op"), name: "g" });
  await pythonRefuses("OSError");
  const res = await uselessPost(post("http://x/api/useless/g", '{"useless":true}'), ctx("g") as never);
  expect(res.status, "BUG: Python-I/O-Fehler als Clientfehler").toBe(500);
});

test("useless POST: Eingabefehler bleiben 400", async () => {
  await writeSession({ root: await tempDataRoot("qa-r3-useless-bad"), name: "g" });
  const noBool = await uselessPost(post("http://x/api/useless/g", '{"useless":"ja"}'), ctx("g") as never);
  expect(noBool.status).toBe(400);
  const badName = await uselessPost(post("http://x/api/useless/x", '{"useless":true}'), ctx("..") as never);
  expect(badName.status).toBe(400);
  const long = JSON.stringify({ useless: true, reason: "x".repeat(5000) });
  expect((await uselessPost(post("http://x/api/useless/g", long), ctx("g") as never)).status).toBe(400);
});

test("cell GET: ein ungueltiger Name ist 400, kein Serverfehler", async () => {
  await tempDataRoot("qa-r3-cell-name");
  const res = await cellGet(new Request("http://x/api/cell/x/000110/e4"),
    { params: Promise.resolve({ name: "..", stem: "000110", square: "e4" }) });
  expect(res.status, "BUG: checkName wird zu 500").toBe(400);
});
