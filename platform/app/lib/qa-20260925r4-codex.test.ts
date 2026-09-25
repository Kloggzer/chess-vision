import { afterEach, expect, test } from "vitest";
import { POST as confirmPost } from "@/app/api/confirm/[name]/route";
import { POST as uselessPost } from "@/app/api/useless/[name]/route";
import { setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

const ctx = (name: string) => ({ params: Promise.resolve({ name }) });
const post = (url: string, body: string) => new Request(url, { method: "POST", body });

afterEach(async () => {
  await stopPyWorker();
  setPyWorkerCommand(null);
});

test("jsonBody: gueltiges JSON null ist ein Requestfehler, kein Serverfehler", async () => {
  await writeSession({ root: await tempDataRoot("qa-r4-null"), name: "g" });

  const response = await uselessPost(post("http://x/api/useless/g", "null"), ctx("g") as never);

  expect(response.status, "BUG: jsonBody akzeptiert null; body.useless wirft danach TypeError").toBe(400);
});

test("confirm: ein fehlender Kandidat ist 404, kein Serverfehler", async () => {
  await tempDataRoot("qa-r4-confirm-missing");
  const reply = [
    'process.stdin.setEncoding("utf8"); let b="";',
    'process.stdin.on("data", c => { b += c; let i;',
    'while ((i = b.indexOf("\\n")) >= 0) { const s=b.slice(0,i); b=b.slice(i+1);',
    'if (!s) continue; const q=JSON.parse(s);',
    'process.stdout.write(JSON.stringify({id:q.id,ok:false,kind:"FileNotFoundError",error:"candidate.json"})+"\\n"); }});',
  ].join("");
  await stopPyWorker();
  setPyWorkerCommand({ command: process.execPath, args: ["-e", reply] });

  const response = await confirmPost(post("http://x/api/confirm/g", '{"kept":[]}'), ctx("g"));

  expect(response.status, "BUG: errorStatus erkennt Python-FileNotFoundError nicht als fehlende Ressource").toBe(404);
});
