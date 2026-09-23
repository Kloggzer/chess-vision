/** Die Logdatei eines Jobs: hineinschreiben, und herauslesen, was der Mensch wissen muss — die
 *  Verweigerung, die letzten Worte, den Schwanz fuer `/game/<name>`. */
import { createWriteStream, type WriteStream } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import type { Job } from "@/lib/chain/slot";
import { absentOnly } from "@/lib/measurement";

/** Ein Abschluss, nicht zwei: ein gescheiterter Spawn feuert `error` UND `close`, und ein zweites
 *  `end` in den geschlossenen Strom riss den Server ab. */
export function logSink(log: string, first: string): { stream: WriteStream; end: (text: string) => void } {
  const stream = createWriteStream(log, { flags: "a" });
  // Eine volle Platte darf den Server nicht mitnehmen; der Job faellt ueber seinen Exit-Code auf.
  stream.on("error", () => undefined);
  stream.write(first);
  let ended = false;
  return { stream, end: (text) => { if (ended) return; ended = true; stream.end(text); } };
}

/** The verb's one refusal line, LAST wins — a retry appends to the same log. */
export function refusalOf(log: string): string | null {
  const lines = log.split(/\r?\n/);
  const refused = lines.findLast((l) => l.startsWith("refused: "));
  if (refused !== undefined) return refused.slice("refused: ".length);
  return tracebackReason(lines);
}

/** Rich malt den Traceback in einen Kasten, also zaehlt nicht die letzte ZEILE des Logs. */
const FRAME = /^[\s│╭╰└┌┐┘├┤─━╌·]*$/;

/** Die Ausnahme unter einem Python-Traceback — `exit 1` sagt nicht, WAS schiefging. */
function tracebackReason(lines: string[]): string | null {
  const start = lines.findLastIndex((l) => l.trimStart().startsWith("Traceback (most recent call last)"));
  if (start < 0) return null;
  const last = lines.slice(start + 1).findLast((l) => l.trim() !== "" && !FRAME.test(l));
  return last === undefined ? null : last.replace(/^[\s│]+|[\s│]+$/g, "");
}

/** Only the CURRENT run's lines: the log is appended across runs, each starting with `$ <command>`. */
export function lastRunOf(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const start = lines.map((l, i) => (l.startsWith("$ ") ? i : -1)).filter((i) => i >= 0).at(-1);
  return start === undefined ? lines : lines.slice(start);
}

export async function lastWords(log: string): Promise<string> {
  const text = await readFile(log, "utf8").catch(() => "");
  const lines = lastRunOf(text).map((l) => l.trim()).filter(Boolean);
  const meaty = lines.filter(
    (l) => !/^(Metadata|creation_time|handler_name|vendor_id|major_brand|minor_version|compatible_brands|com\.android|Side data|displaymatrix|Stream #|Duration:|Input #|\[mov|encoder|at [a-z]|frame \d)/i.test(l),
  );
  const refusal = meaty.findLast((l) => /exception|refus|no accepted|error|failed|not found/i.test(l));
  return (refusal ?? meaty.findLast((l) => !/^exit \d/.test(l)) ?? "the tool printed nothing").slice(0, 240);
}

const TAIL_BYTES = 64 * 1024;

/** A replay writes megabytes into one log; `/game/<name>` shows its last words, not the file. */
export async function jobLogTail(job: Job, lines = 30): Promise<string[]> {
  if (!job.log) return [];
  const info = await stat(job.log).catch(absentOnly);
  if (!info || info.size === 0) return [];
  const handle = await open(job.log, "r");
  try {
    const length = Math.min(TAIL_BYTES, info.size);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, info.size - length);
    return buffer.toString("utf8").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).slice(-lines);
  } finally {
    await handle.close();
  }
}
