/** Welche Werkzeuge die Kette startet und mit welcher Zeile — ohne Platte und ohne Prozess, damit
 *  `jobs.test.ts` (cli-parity) jede Zeile gegen `src/chesslab/cli/` halten kann. */
import path from "node:path";
import { checkName, dataDir } from "@/lib/session-store/recordings";
import { matteTarget } from "@/lib/session-store/matte";

export function repoDir(): string {
  return process.env.CHESSLAB_REPO_DIR ?? path.dirname(dataDir());
}

/** The installed distribution, not Gradle: a job queue must not depend on a Gradle daemon that may
 *  be busy with the user's own build. */
export function desktopBinary(): string {
  if (process.env.CHESSLAB_DESKTOP_BIN) return process.env.CHESSLAB_DESKTOP_BIN;
  const bin = process.platform === "win32" ? "desktop.bat" : "desktop";
  return path.join(repoDir(), "android", "desktop", "build", "install", "desktop", "bin", bin);
}

export function desktopWorkDir(): string {
  return path.join(repoDir(), "android", "desktop");
}

/** `uv` by default, because that is what `README.md` tells a human to type. */
export function uvBinary(): string {
  return process.env.CHESSLAB_UV ?? "uv";
}

/** No default: the verb REFUSES a model that trained on the session, so the run is a per-session
 *  choice — a hardcoded one would mark half the corpus failed-for-good. */
export function modelReadRun(): string | null {
  return process.env.CHESSLAB_MODEL_READ_RUN?.trim() || null;
}

/** The one model name the chain speaks — the bundled default. */
export const DESKTOP_MODEL = "p4a-80-clahe";

/** [lens] is a decision, not a flag: WITH it the verb refuses a label whose optics could not be
 *  established. Right for the rig camera; the phone's grid fit refuses every time — see `lensFor`. */
export function labelArgs(video: string, name: string, lens = true): string[] {
  const args = ["replay", video, "label", `name=${checkName(name, "transfer name")}`, `model=${DESKTOP_MODEL}`];
  return lens ? [args[0], args[1], args[2], "lens", ...args.slice(3)] : args;
}

/** No `model=`, no `force=1`: an existing candidate is a refusal a human answers, never something a
 *  press overwrites. */
export function phoneArgs(recordingDir: string): string[] {
  return ["phone-candidate", recordingDir];
}

/**
 * `id=` carries IDENTITY: the pack keys every manifest row with it, and `corrections.jsonl` dedups
 * on `(session_id, frame, square)`. The verb's default is the video's stem — and every LAN transfer
 * is `files/sessions/<id>/video.mp4`, so without it one verdict would rule on another's crop.
 */
export function packArgs(video: string, game: string, out: string, id: string): string[] {
  const args = ["training-video-pack", video, game, out, `id=${checkName(id, "transfer name")}`];
  // The recording's own knobs, for the PACK only: `alignEvery` decides how straight the training
  // cells are cut, and the desktop default cuts at a cadence the phone never recorded at. Which moves
  // a replay finds must not depend on a recording's settings.
  const settings = path.join(path.dirname(video), "settings.json");
  return [...args, `config=${settings}`];
}

/** Fail-closed on optics, decided by the CAMERA: a video under `files/sessions/` came off the phone,
 *  whose grid fit refuses every time (k1 ~ 0). */
export function lensFor(video: string): boolean {
  return !/[\\/]files[\\/]sessions[\\/]/.test(video);
}

/** Beide Nachlaeufe als eigene Zeilen, damit `cli-parity` auch sie gegen die CLI haelt. */
export const retimeArgs = (name: string): string[] => ["run", "chesslab", "realgames", "retime", name];
export const positionFlagsArgs = (): string[] => ["run", "chesslab", "realgames", "position-flags"];

export type ChesslabStep = "export" | "adopt-dirty" | "settle-scan" | "matte" | "temporal" | "model-read";

/** Das Verb je Sprosse — `cli-parity` haelt jedes davon gegen `src/chesslab/cli/`. */
export const VERB: Record<ChesslabStep, string> = {
  export: "realgames export-session",
  "adopt-dirty": "realgames adopt-dirty",
  "settle-scan": "session settle-scan",
  matte: "occluders alpha-worker",
  temporal: "session temporal-pass",
  "model-read": "realgames model-read",
};

/** Own function, because a misspelled flag otherwise surfaces hours into a run (cli-parity).
 *  `--reported` beats `--wanted` beats `--limit` — the human before the pile. */
export function chesslabArgs(
  step: ChesslabStep,
  names: string[],
  opts: { model?: string | null; matte?: "reported" | "wanted" | "limit"; limit?: number } = {},
): string[] {
  // `session` verbs take the SESSION id, and a recording keeps the `rg-` the directory dropped.
  const args = ["run", "chesslab", ...VERB[step].split(" "),
                ...(step === "settle-scan" ? [`rg-${names[0]}`] : names)];
  if (step === "model-read" && opts.model) args.push("--model", opts.model);
  if (step === "matte") {
    if (opts.matte === "reported") args.push("--reported");
    else if (opts.matte === "wanted") args.push("--wanted");
    else args.push("--limit", String(opts.limit ?? matteTarget()));
  }
  return args;
}
