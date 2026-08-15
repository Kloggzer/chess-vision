export type Failure = { text: string; log: string | null };

/** Job reasons read `<what> — see <log path>`; the path drowns the what, so split it off. */
export function failureParts(reason: string): Failure {
  const at = reason.indexOf(" — see ");
  if (at === -1) return { text: reason, log: null };
  return { text: reason.slice(0, at), log: reason.slice(at + " — see ".length).trim() };
}

export function logName(log: string): string {
  return log.split(/[\\/]/).at(-1) ?? log;
}
