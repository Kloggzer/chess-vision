/** vitest-globalSetup: EIN echter Python-Worker fuer die ganze Suite. Jede Testdatei startete sonst
 *  ihren eigenen, und gleichzeitige Python-Starts dauern hier nach einer Pause 5-14 s statt 0,3 s
 *  (`docs/web-ruft-python.md`, Latenz). Die Dateien bekommen ein Node-Relais auf diesen Worker. */
import { createServer, type AddressInfo, type Socket } from "node:net";
import { createInterface } from "node:readline";
import { PyOpFailed, pyCall, pythonCommand, setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";

const RELAY = (port: number) =>
  `const s=require("net").connect(${port},"127.0.0.1");s.setNoDelay(true);process.stdin.pipe(s);s.pipe(process.stdout);` +
  `s.on("close",()=>process.exit(0));s.on("error",e=>{process.stderr.write(String(e)+"\\n");process.exit(1)});`;

/** Kein Zeitlimit hier: das der Testdatei gilt, und ihr Relais stirbt mit ihr. */
const BROKER_TIMEOUT_MS = 600_000;

function serve(sock: Socket): void {
  sock.setNoDelay(true);
  sock.on("error", () => undefined);
  const send = (reply: object) => {
    if (!sock.destroyed) sock.write(JSON.stringify(reply) + "\n");
  };
  // Ein getoetetes Relais reisst die Verbindung ab (ECONNRESET) — das ist sein normales Ende.
  const lines = createInterface({ input: sock });
  lines.on("error", () => undefined);
  lines.on("line", async (line) => {
    let req: { id?: unknown; op?: unknown; args?: Record<string, unknown> };
    try {
      req = JSON.parse(line);
    } catch {
      sock.destroy();
      return;
    }
    try {
      send({ id: req.id, ok: true, value: await pyCall(String(req.op), req.args ?? {}, BROKER_TIMEOUT_MS) });
    } catch (e) {
      // Python lehnte ab: dieselbe Zeile wie vom Worker. Keiner antwortete: das Relais stirbt -> PyWorkerDown.
      if (e instanceof PyOpFailed) send({ id: req.id, ok: false, error: e.detail, kind: e.kind });
      else sock.destroy();
    }
  });
}

export default async function setup(): Promise<() => Promise<void>> {
  setPyWorkerCommand(pythonCommand());
  const server = createServer(serve);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  process.env.CHESSLAB_PY_WORKER = JSON.stringify({ command: process.execPath, args: ["-e", RELAY(port)] });
  await pyCall("ping").catch(() => undefined); // der eine Kaltstart, bevor die Dateien laufen
  return async () => {
    server.close();
    await stopPyWorker();
  };
}
