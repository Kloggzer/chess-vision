/** Der Lebenszyklus des Python-Workers an einem Fake (kleines Node-Skript), dann einmal am echten
 *  `chesslab web-worker`. Kein Fehler darf still auf TS zurueckfallen (`docs/web-ruft-python.md`). */
import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { Contested } from "@/lib/atomic";
import { PyOpFailed, PyWorkerDown, pyCall, pythonBinary, pyWorkerPid, setPyWorkerCommand, stopPyWorker } from "@/lib/py/worker";
import { tempDataRoot, writeSession } from "@/lib/test-fixtures";

// Antwortet auf `{id, op, args}`; die Op sagt dem Fake, wie er sich benehmen soll.
const FAKE = `
import { createInterface } from "node:readline";
const reply = (r) => process.stdout.write(JSON.stringify(r) + "\\n");
let held = null;
createInterface({ input: process.stdin }).on("line", (line) => {
  const { id, op, args } = JSON.parse(line);
  if (op === "echo") return reply({ id, ok: true, value: args });
  if (op === "slow") { held = id; return; }
  if (op === "fast") { reply({ id, ok: true, value: "fast" }); if (held !== null) reply({ id: held, ok: true, value: "slow" }); return; }
  if (op === "fail") return reply({ id, ok: false, error: args.error, kind: args.kind });
  if (op === "die") { process.stderr.write("Traceback: boom\\n"); process.exit(3); }
  if (op === "garbage") return process.stdout.write("kein json\\n");
  if (op === "pid") return reply({ id, ok: true, value: process.pid });
  if (op === "confirm") return reply({ id, ok: false, error: "x", kind: process.env.FAKE_KIND });
  // "hang": nie antworten
});
`;

let fake = "";
beforeAll(async () => {
  fake = path.join(await mkdtemp(path.join(tmpdir(), "chesslab-pyfake-")), "fake.mjs");
  await writeFile(fake, FAKE, "utf8");
});

afterEach(async () => {
  await stopPyWorker();
  setPyWorkerCommand(null);
});

const fakeWorker = () => setPyWorkerCommand({ command: process.execPath, args: [fake] });

describe("Fake-Worker", () => {
  test("Anfragen tragen ids: eine spaete Antwort landet bei ihrer Anfrage, nicht bei der naechsten", async () => {
    fakeWorker();
    const slow = pyCall("slow");
    const fast = pyCall("fast");
    expect(await fast).toBe("fast");
    expect(await slow).toBe("slow");
    expect(await pyCall("echo", { a: [1, "ü"] })).toEqual({ a: [1, "ü"] });
  });

  test("eine abgelehnte Op wirft PyOpFailed mit der Klasse der Ausnahme", async () => {
    fakeWorker();
    const err = await pyCall("fail", { error: "nope", kind: "ValueError" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PyOpFailed);
    expect(err).toMatchObject({ kind: "ValueError", detail: "nope" });
  });

  test("stirbt er, antwortet der Aufruf mit Grund und stderr — und der naechste startet neu", async () => {
    fakeWorker();
    const first = await pyCall<number>("pid");
    const err = await pyCall("die").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PyWorkerDown);
    expect(String(err)).toMatch(/exit 3.*Traceback: boom/);
    const second = await pyCall<number>("pid");
    expect(second).not.toBe(first);
  });

  test("haengt er, faellt die Anfrage am Zeitlimit, und der Worker wird ersetzt", async () => {
    fakeWorker();
    const first = await pyCall<number>("pid");
    await expect(pyCall("hang", {}, 300)).rejects.toThrow(/keine Antwort nach 300 ms/);
    expect(await pyCall<number>("pid")).not.toBe(first);
  });

  test("eine Zeile, die kein JSON ist, legt ihn still — nicht als Antwort gelesen", async () => {
    fakeWorker();
    await expect(pyCall("garbage")).rejects.toBeInstanceOf(PyWorkerDown);
  });

  test("nicht startbar: PyWorkerDown mit dem Pfad, kein Rueckfall", async () => {
    setPyWorkerCommand({ command: path.join(tmpdir(), "gibt-es-nicht", "python.exe"), args: [] });
    await expect(pyCall("ping")).rejects.toThrow(/nicht startbar/);
  });

  test("stopPyWorker beendet den Prozess", async () => {
    fakeWorker();
    const pid = await pyCall<number>("pid");
    await stopPyWorker();
    expect(pyWorkerPid()).toBeUndefined();
    expect(() => process.kill(pid, 0)).toThrow();
  });
});

describe("Routen und Riegel ueber den Worker", () => {
  const confirm = async (body: object) => {
    const { POST } = await import("@/app/api/confirm/[name]/route");
    return POST(new Request("http://x/api/confirm/g", { method: "POST", body: JSON.stringify(body) }),
      { params: Promise.resolve({ name: "g" }) });
  };

  test("Worker tot: /api/confirm antwortet 500 mit dem Grund", async () => {
    await writeSession({ root: await tempDataRoot("py-dead"), name: "g", moves: [] });
    setPyWorkerCommand({ command: path.join(tmpdir(), "gibt-es-nicht", "python.exe"), args: [] });
    const res = await confirm({ kept: [] });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/nicht startbar/);
  });

  test("Pythons Riegel kommen als dieselben Fehler an wie vorher: ReferenceMoved (409) und Contested", async () => {
    await writeSession({ root: await tempDataRoot("py-kinds"), name: "g", moves: [] });
    const { writeConfirmation, ReferenceMoved } = await import("@/lib/session-store/recordings");
    const kinds = async (kind: string) => {
      process.env.FAKE_KIND = kind;
      await stopPyWorker();
      fakeWorker();
      return writeConfirmation("g", []).catch((e: unknown) => e);
    };
    expect(await kinds("ReferenceMoved")).toBeInstanceOf(ReferenceMoved);
    expect(await kinds("VerdictContested")).toBeInstanceOf(Contested);
    expect(await kinds("PermissionError")).toBeInstanceOf(PyOpFailed);
    delete process.env.FAKE_KIND;
  });
});

// Der echte Worker; ohne venv kein Test, und das sagt er.
const venvMissing = (() => {
  try {
    return !existsSync(pythonBinary());
  } catch {
    return true;
  }
})();

describe.skipIf(venvMissing)("echter chesslab web-worker (skip: kein venv unter CHESSLAB_PYTHON)", () => {
  test("ein Prozess fuer viele Anfragen, und eine unbekannte Op ist ein Fehler, keine Antwort", async () => {
    const a = await pyCall<{ pid: number }>("ping");
    expect(await pyCall("lcs_report", { truth: ["e4", "e5"], cand: ["e4", "d5"] }))
      .toEqual({ matched: [[0, 0]], invented: [1], missed: [1] });
    expect((await pyCall<{ pid: number }>("ping")).pid).toBe(a.pid);
    const err = await pyCall("gibt-es-nicht").catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: "UnknownOp" });
  });

  test("ein Python-Fehler kommt mit seiner Klasse an", async () => {
    const err = await pyCall("lcs_report", { truth: ["e4"] }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PyOpFailed);
    expect(err).toMatchObject({ kind: "TypeError" });
  });
});
