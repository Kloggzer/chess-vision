export type Failure = { text: string; log: string | null; code: number | null };

const SEE = " — see ";
const EXIT = /\s*\(exit (-?\d+), ([^)]+)\)\s*$/;
const JVM = /^Exception in thread "[^"]*" [\w.$]+: /;
const ABSOLUTE = /"[A-Za-z]:[\\/][^"]*"|"?[A-Za-z]:[\\/]\S+/g;

export function logName(log: string): string {
  return log.replace(/"/g, "").split(/[\\/]/).at(-1) ?? log;
}

/** A path in the sentence drowns the sentence; the file name is the part a human acts on. */
export const trimPaths = (text: string) => text.replace(JVM, "").replace(ABSOLUTE, logName);

/** Two shapes on disk: `<what> — see <log>` from the job runner, `(exit n, <log>)` from the tools. */
export function failureParts(reason: string): Failure {
  const exit = EXIT.exec(reason);
  if (exit) return { text: trimPaths(reason.slice(0, exit.index)), log: exit[2].trim(), code: Number(exit[1]) };
  const at = reason.indexOf(SEE);
  if (at === -1) return { text: trimPaths(reason), log: null, code: null };
  return { text: trimPaths(reason.slice(0, at)), log: reason.slice(at + SEE.length).trim(), code: null };
}
