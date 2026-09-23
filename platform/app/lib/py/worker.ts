/** Der warme Python-Prozess (`chesslab web-worker`), den die Web-App fragt, statt Python nachzubauen
 *  (`docs/web-ruft-python.md`). JSON-Zeilen `{id, op, args}` -> `{id, ok, value | error, kind}`. */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { createInterface } from "node:readline";

/** Python hat die Op ausgefuehrt und abgelehnt — `kind` ist die Klasse der Ausnahme. */
export class PyOpFailed extends Error {
  constructor(readonly op: string, readonly kind: string, readonly detail: string) {
    super(`${op}: ${kind}: ${detail}`);
  }
}

/** Kein Python hat geantwortet: nicht startbar, gestorben, Zeitlimit. Die Route antwortet 500. */
export class PyWorkerDown extends Error {}

/** Das Repo liegt neben den Daten, ausser jemand sagt es anders — auch fuer die Kette (`cli-args`). */
export function repoDir(): string {
  if (process.env.CHESSLAB_REPO_DIR !== undefined) return process.env.CHESSLAB_REPO_DIR;
  const data = process.env.CHESSLAB_DATA_DIR;
  if (!data) throw new Error("CHESSLAB_DATA_DIR is unset — see platform/app/README.md");
  return path.dirname(data);
}

/** Das venv-Python direkt: `uv run` kostet ~550 ms je Start und startet einen zweiten Prozessbaum. */
export function pythonBinary(): string {
  if (process.env.CHESSLAB_PYTHON) return process.env.CHESSLAB_PYTHON;
  const venv = path.join(repoDir(), ".venv");
  return process.platform === "win32" ? path.join(venv, "Scripts", "python.exe") : path.join(venv, "bin", "python");
}

/** Den ganzen Baum: der venv-Starter unter Windows ist ein eigener Prozess vor dem Interpreter. */
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

type Command = { command: string; args: string[] };
type Pending = { op: string; resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout };
type Answer = { id?: unknown; ok?: unknown; value?: unknown; error?: unknown; kind?: unknown };

const TAIL = 20;
const DEFAULT_TIMEOUT_MS = 20_000;

class Worker {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<number, Pending>();
  private readonly tail: string[] = [];
  private next = 1;
  down: string | null = null;

  constructor(cmd: Command, private readonly onDown: (w: Worker) => void) {
    this.proc = spawn(cmd.command, cmd.args, {
      windowsHide: true,
      env: { ...process.env, OPENBLAS_NUM_THREADS: "1", PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    });
    createInterface({ input: this.proc.stdout }).on("line", (line) => this.answer(line));
    createInterface({ input: this.proc.stderr }).on("line", (line) => {
      this.tail.push(line);
      if (this.tail.length > TAIL) this.tail.shift();
    });
    this.proc.on("error", (e) => this.die(`${cmd.command} nicht startbar: ${e.message}`));
    this.proc.on("close", (code, signal) => this.die(`web-worker beendet (${signal ?? `exit ${code}`})`));
    this.proc.stdin.on("error", (e) => this.die(`stdin: ${e.message}`));
    // Ein wartender Aufruf haelt die Ereignisschleife ueber seinen Timer; ein leerer Worker nicht.
    this.proc.unref();
    for (const s of [this.proc.stdin, this.proc.stdout, this.proc.stderr]) (s as unknown as { unref?: () => void }).unref?.();
  }

  get pid(): number | undefined {
    return this.proc.pid;
  }

  call(op: string, args: Record<string, unknown>, timeoutMs: number): Promise<unknown> {
    if (this.down) return Promise.reject(new PyWorkerDown(this.down));
    const id = this.next++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        // Ein haengender Worker haelt jede spaetere Anfrage auf: weg damit, der naechste Aufruf startet neu.
        this.die(`${op}: keine Antwort nach ${timeoutMs} ms`);
        void this.stop();
      }, timeoutMs);
      this.pending.set(id, { op, resolve, reject, timer });
      this.proc.stdin.write(JSON.stringify({ id, op, args }) + "\n");
    });
  }

  private answer(line: string): void {
    let reply: Answer;
    try {
      reply = JSON.parse(line) as Answer;
    } catch {
      this.die(`keine JSON-Antwort: ${line.slice(0, 200)}`);
      void this.stop();
      return;
    }
    const waiting = typeof reply.id === "number" ? this.pending.get(reply.id) : undefined;
    if (!waiting) return; // die Antwort auf eine Anfrage, die schon am Zeitlimit starb
    this.pending.delete(reply.id as number);
    clearTimeout(waiting.timer);
    if (reply.ok === true) waiting.resolve(reply.value);
    else waiting.reject(new PyOpFailed(waiting.op, String(reply.kind ?? "Error"), String(reply.error ?? "")));
  }

  private die(reason: string): void {
    if (this.down) return;
    const tail = this.tail.length > 0 ? ` — stderr: ${this.tail.join(" | ")}` : "";
    this.down = reason + tail;
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new PyWorkerDown(`${p.op}: ${this.down}`));
    }
    this.pending.clear();
    this.onDown(this);
  }

  async stop(): Promise<void> {
    this.die("gestoppt");
    this.proc.stdin.end();
    if (this.proc.pid !== undefined && this.proc.exitCode === null) await killTree(this.proc.pid);
  }
}

/** Der Rumpf von `chesslab web-worker` ohne Typers Kommandobaum: der kostete gemessen 0,4-1,4 s je
 *  Start, bei acht gleichzeitigen 12 s (die Testsuite startet einen je Datei). */
const WEB_WORKER = "from chesslab.cli.web_worker import web_worker; web_worker()";

type Slot = { worker: Worker | null; command: Command | null };
/** Auf `globalThis`, wie die Job-Queue: ein Hot Reload darf keinen zweiten Worker starten. */
const slot: Slot = ((globalThis as { __chesslabPy?: Slot }).__chesslabPy ??= { worker: null, command: null });

/** Nur fuer Tests: ein anderes Programm als den Worker (`null` = wieder der echte). */
export function setPyWorkerCommand(command: Command | null): void {
  slot.command = command;
}

function worker(): Worker {
  if (slot.worker && !slot.worker.down) return slot.worker;
  const command = slot.command ?? { command: pythonBinary(), args: ["-c", WEB_WORKER] };
  slot.worker = new Worker(command, (w) => {
    if (slot.worker === w) slot.worker = null;
  });
  return slot.worker;
}

/** Eine Op fragen. Scheitert Python, wirft `PyOpFailed`; antwortet keins, `PyWorkerDown` —
 *  es gibt keinen Rueckfall auf TS, sonst gaebe es wieder zwei Wahrheiten. */
export async function pyCall<T>(op: string, args: Record<string, unknown> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return (await worker().call(op, args, timeoutMs)) as T;
}

export async function stopPyWorker(): Promise<void> {
  const w = slot.worker;
  slot.worker = null;
  if (w) await w.stop();
}

/** Die PID des laufenden Workers, fuer Tests des Lebenszyklus. */
export const pyWorkerPid = (): number | undefined => (slot.worker && !slot.worker.down ? slot.worker.pid : undefined);
