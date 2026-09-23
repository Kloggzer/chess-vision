/** Welche Werkzeuge die Kette startet und mit welcher Zeile — ohne Platte und ohne Prozess, damit
 *  `jobs.test.ts` (cli-parity) jede Zeile gegen `src/chesslab/cli/` halten kann. */
import path from "node:path";
import { checkName, dataDir } from "@/lib/session-store/recordings";
import { matteTarget } from "@/lib/session-store/matte";

export function repoDir(): string {
  return process.env.CHESSLAB_REPO_DIR ?? path.dirname(dataDir());
}

/**
 * The installed distribution, not Gradle: `scripts/replay-batch.ps1` builds it once and runs the
 * binary directly, and a job queue must not depend on a Gradle daemon that may be busy with a
 * build the user started.
 */
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

/**
 * The run dir `realgames model-read` is given, from `CHESSLAB_MODEL_READ_RUN`. No default: the
 * verb REFUSES a model that trained on the session, so which run is right is a per-session choice
 * a human makes, and a hardcoded one would mark half the corpus failed-for-good in the ledger.
 */
export function modelReadRun(): string | null {
  return process.env.CHESSLAB_MODEL_READ_RUN?.trim() || null;
}

/** The one model name the chain speaks — the bundled default; `real14-80` left the APK on 292838ec. */
export const DESKTOP_MODEL = "p4a-80-clahe";

/**
 * [lens] is a decision, not a flag: WITH it the verb refuses a label whose optics could not be
 * established (specs/52: 003957 fell from 67 plies to 15). Right for the rig camera; the PHONE
 * corrects itself and its grid fit is refused every time (k1 ~ 0, 2026-08-10) — see `lensFor`.
 */
export function labelArgs(video: string, name: string, lens = true): string[] {
  const args = ["replay", video, "label", `name=${checkName(name, "transfer name")}`, `model=${DESKTOP_MODEL}`];
  return lens ? [args[0], args[1], args[2], "lens", ...args.slice(3)] : args;
}

/**
 * The phone's own record instead of the replay: seconds, and the whole bundle is the argument. No
 * `model=`, no `force=1` — the verb defaults to the bundled model like `labelArgs`, and an existing
 * candidate is a refusal a human answers, never something a press overwrites.
 */
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
  // The recording's own knobs, for the PACK only. `alignEvery` is a crop-geometry knob — it decides
  // how often the quad is re-measured, i.e. how straight the training cells are cut — and the
  // desktop default of 3 cuts them at a cadence the phone never recorded at. Tracking does not get
  // this file: which moves a replay finds is not supposed to depend on a recording's settings.
  const settings = path.join(path.dirname(video), "settings.json");
  return [...args, `config=${settings}`];
}

/**
 * Fail-closed on optics, decided by the CAMERA: a video under `files/sessions/` came off the phone,
 * whose grid fit refuses every time (k1 ~ 0, nine videos 2026-08-10/13) — "warum muss ich das
 * manuell klicken" (the user). Everything else keeps specs/52's fail-closed rule.
 */
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

/**
 * Die ganze Kommandozeile einer Sprosse. Eigene Funktion, weil ein falsch buchstabiertes Flag
 * sonst erst im stundenlangen Lauf auffaellt (cli-parity).
 * `--reported` schlaegt `--wanted` schlaegt `--limit` — der Mensch vor dem Stapel.
 */
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
