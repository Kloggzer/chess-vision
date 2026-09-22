/**
 * The ladder from a transferred recording to the labelling stream, as a STATE, not a procedure.
 *
 * Seven rungs with a human in the middle (`docs/phone-transfer.md`): the tracker proposes a move
 * list, a person judges it, the confirmed intervals become a session, SAM cuts the hand out of its
 * occluded frames, the three-frame sensor catches what SAM missed, and a model reads it. Each
 * step's input is the previous file, so the next step is not a decision — it is READ OFF THE DISK.
 * The UI therefore offers exactly one button, and never one whose input does not exist yet.
 */
import { createHash } from "node:crypto";
import { open, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { gameDir } from "@/lib/data";
import { dataDir } from "@/lib/data";
import { readJsonl, stripBom } from "@/lib/jsonl";
import { type MatteCensus, matteCensus, matteSources } from "@/lib/matte";
import { firstUnfinalized } from "@/lib/mp4";
import { sessionDir } from "@/lib/session";
import { type UselessFlag, uselessFlag } from "@/lib/useless";

/** `phone-record`, `label`, `matte` and `model-read` are jobs; `confirm` and `labeln` are pages. */
export type ChainStep = "phone-record" | "label" | "confirm" | "export" | "settle-scan" | "matte" | "temporal" | "model-read" | "labeln";

export type ChainState = {
  /** Null = nothing to do here: the game is flagged useless, and no step is offered at all. */
  step: ChainStep | null;
  /** Warum genau dieser Schritt offen ist, in einem Satz — die Oberflaeche zeigt ihn. */
  reason: string;
  /** The recording the chain runs on, relative to the data dir — null when the bundle has none. */
  video: string | null;
  /** Set when the video cannot be decoded at all, in the words of what is wrong with it. */
  videoBroken: string | null;
  /** A PGN the phone recorded is truth the confirm screen can compare against. One click adopts it. */
  offeredPgn: string | null;
  hasReference: boolean;
  /** The phone tracked this game and its record names the session: `phone-candidate` can run. */
  hasPhoneRecord: boolean;
  hasCandidate: boolean;
  confirmed: boolean;
  hasSession: boolean;
  /** `session settle-scan` hat gemessen: ohne `settle_dev` ist eine Zelle nicht unstrittig,
   *  sondern ungemessen, und die Strittig-Lane bliebe leer statt zu widersprechen. */
  hasSettle: boolean;
  /** Alphas on disk, the occluded pile, and what one run targets of it (`lib/matte.ts`). */
  mattes: MatteCensus;
  /** `session temporal-pass` ran to its end: `data/reports/temporal-mattes/<name>/pass.json`. */
  hasTemporalPass: boolean;
  hasModelReads: boolean;
  /** Sprossen, deren Datei zwar daliegt, deren `_source` aber nicht mehr zur `log.jsonl` passt,
   *  je mit dem Satz, der sagt warum. */
  outdated: Partial<Record<ChainStep, string>>;
  /** The human's "nutzlos" verdict, active only — see `lib/useless.ts`. */
  useless: UselessFlag | null;
};

/** Nur ENOENT heisst „die Sprosse lief nie". Eine Datei, die DA ist und nicht gelesen werden
 *  kann, gehoert dem Aufrufer — als „nie gelaufen" bietet die Kette denselben Lauf erneut an. */
function absentOnly(error: unknown): null {
  if ((error as { code?: string })?.code !== "ENOENT") throw error;
  return null;
}

async function exists(file: string): Promise<boolean> {
  return (await stat(file).catch(absentOnly)) !== null;
}

/**
 * The bundle's own recording: the newest session directory that has a video, else the mirrored copy.
 *
 * Some transfers carry `video.mp4` beside `files/` as well, some ONLY there (`2026-08-30-14-33-02`).
 */
async function videoOf(name: string): Promise<string | null> {
  const dir = gameDir(name);
  const sessions = path.join(dir, "files", "sessions");
  let ids: string[] = [];
  try {
    ids = (await readdir(sessions, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    /* no sessions/ — the mirrored copy may still be there */
  }
  for (const id of ids.sort().reverse()) {
    const video = path.join(sessions, id, "video.mp4");
    if (await exists(video)) return video;
  }
  const mirrored = path.join(dir, "video.mp4");
  return (await exists(mirrored)) ? mirrored : null;
}

/**
 * An exported session, not merely a `log.jsonl` — and whether `settle-scan` has measured it.
 *
 * The export writes frames first and log.jsonl LAST, so the directory alone proves nothing: a
 * killed export left one, the chain offered the next step, and Python refused (2026-08-15). And a
 * mirrored bundle keeps the PHONE's own commit log under that very name — `frame` rows, no `board`
 * — which read as an export and skipped the export rung outright (Phase 00, `2026-08-30-14-33-02`).
 */
async function exportedSession(name: string): Promise<{ exported: boolean; settled: boolean }> {
  const text = await readFile(path.join(sessionDir(name), "log.jsonl"), "utf8").catch(absentOnly);
  // Hier wird NICHT geworfen, anders als in `loadSession` auf derselben Datei: die Kette ist die
  // Seite, die den naechsten Knopf zeigt, und eine kaputte Zeile darf die ganze Aufnahmeliste
  // nicht 500en (dieselbe Entscheidung wie beim `candidate.json`-Parse unten).
  const rows = readJsonl(text ?? "").rows as { board?: unknown; ply?: unknown; settle_dev?: unknown }[];
  if (rows.length === 0 || !("board" in rows[0])) return { exported: false, settled: false };
  const perPly = new Map<unknown, number>();
  for (const row of rows) if (row.board) perPly.set(row.ply, (perPly.get(row.ply) ?? 0) + 1);
  // Ein Intervall unter `realgames.SETTLE_MIN_FRAMES` kann der Scan gar nicht bewerten; die
  // Sprosse darauf offen zu halten hiesse, winzige Aufnahmen fuer immer auf einen Knopf zu setzen.
  const measurable = Math.max(0, ...perPly.values()) >= 5;
  return { exported: true, settled: !measurable || rows.some((row) => row.settle_dev !== undefined) };
}

/** The stamp both producers write: `${ms}:${bytes}`, the shape `lib/session.ts` caches on. */
async function stampOf(file: string): Promise<string | null> {
  return stat(file).then((s) => `${Math.floor(s.mtimeMs)}:${s.size}`, () => null);
}

/** Wer die Aufnahme geschnitten hat, als der Lauf lief (`chesslab.provenance.source_stamp`). */
type Provenance = { log?: string; model?: string };

/** `model-reads.jsonl` is one line per CELL — only its header is ever read here.
 *
 *  `null` bei unlesbarer Kopfzeile, nicht `{}`: `{}` hiesse "ungestempelt, gilt weiter" (die Regel
 *  fuer Altbestand), und eine leere Datei — was ein gestoppter Lauf hinterlaesst — schloesse damit
 *  die Sprosse. Der Mensch landete auf `labeln` ohne eine einzige Lesart. */
async function headerOf(file: string): Promise<Provenance | null> {
  // Nur ENOENT heisst "nie gelaufen"; ein EACCES bot sonst den schweren Lauf erneut an.
  const handle = await open(file, "r").catch(absentOnly);
  if (!handle) return null;
  try {
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const line = stripBom(buffer.toString("utf8", 0, bytesRead)).split("\n")[0];
    return (JSON.parse(line) as { _source?: Provenance })._source ?? {};
  } catch {
    return null;
  } finally {
    await handle.close();
  }
}

/**
 * Whether a finished run still belongs to what is on disk now.
 *
 * Eine Datei OHNE Stempel gilt weiter als gueltig: alles, was heute auf der Platte liegt, hat
 * keinen, und sie ungueltig zu nennen risse jeder bestehenden Aufnahme die Kette auf.
 */
function stillCurrent(source: Provenance, log: string | null, model: string | null): boolean {
  // `Provenance`, nicht `Provenance | null`: `null` heisst UNLESBAR und darf die Sprosse nicht
  // schliessen. Hier stand der Fall mit drin und lieferte "gilt weiter" -- dieselbe Antwort wie
  // fuer eine ungestempelte Datei, und genau der Unterschied, den `headerOf` trennt.
  if (source.log === undefined) return true;
  if (model !== null && source.model !== undefined && path.basename(source.model) !== path.basename(model)) return false;
  return sameLog(source.log, log);
}

function sameLog(stamped: string, current: string | null): boolean {
  if (current === null) return false;
  const [ms, size] = stamped.split(":");
  const [nowMs, nowSize] = current.split(":");
  // Python floors the same timestamp through a float in SECONDS, so the millisecond can land one
  // apart; a rewrite moves it by more than that, and the size catches the rest.
  return size === nowSize && Math.abs(Number(ms) - Number(nowMs)) <= 1;
}

/**
 * A game record naming this bundle's session — what `phone-candidate` reads instead of the video.
 *
 * Exactly one session directory, because the verb refuses several: with two, the record names one
 * of them and the video is the other's. `index.json` is the phone's list of records, not a record.
 */
async function phoneRecord(name: string): Promise<boolean> {
  const dir = gameDir(name);
  const entries = (await readdir(path.join(dir, "files", "sessions"), { withFileTypes: true }).catch(absentOnly)) ?? [];
  const ids = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (ids.length !== 1) return false;
  const games = path.join(dir, "files", "games");
  const records = ((await readdir(games).catch(absentOnly)) ?? []).filter((f) => f.endsWith(".json") && f !== "index.json");
  for (const file of records.sort()) {
    const text = (await readFile(path.join(games, file), "utf8").catch(absentOnly)) ?? "";
    try {
      if ((JSON.parse(text) as { sessionId?: string }).sessionId === ids[0]) return true;
    } catch {
      /* a half-written record names nothing */
    }
  }
  return false;
}

/** A `.pgn` the phone wrote beside its game record — the only truth these recordings ever carry. */
async function phonePgn(name: string): Promise<string | null> {
  const games = path.join(gameDir(name), "files", "games");
  const pgns = ((await readdir(games).catch(absentOnly)) ?? []).filter((f) => f.endsWith(".pgn")).sort();
  return pgns.length > 0 ? path.join(games, pgns[pgns.length - 1]) : null;
}

export async function chainState(name: string): Promise<ChainState> {
  const dir = gameDir(name);
  const passFile = path.join(dataDir(), "reports", "temporal-mattes", name, "pass.json");
  const [video, offeredPgn, hasReference, hasPhoneRecord, candidateText, session, mattes, matteStamps, passSource, readsSource, logStamp, useless] = await Promise.all([
    videoOf(name),
    phonePgn(name),
    exists(path.join(dir, "reference.pgn")),
    phoneRecord(name),
    readFile(path.join(dir, "candidate.json"), "utf8").catch(absentOnly),
    exportedSession(name),
    matteCensus(name),
    matteSources(name),
    // Eine halb geschriebene Datei 500te die ganze Aufnahmeliste — der PARSE darf scheitern,
    // das LESEN nicht: ein unlesbares `pass.json` ist kein ungelaufener Sensor.
    readFile(passFile, "utf8").catch(absentOnly).then(sourceOf),
    headerOf(path.join(dir, "model-reads.jsonl")),
    stampOf(path.join(sessionDir(name), "log.jsonl")),
    uselessFlag(name),
  ]);
  // Eine halb geschriebene `candidate.json` ist "noch nicht bestaetigt", kein Grund, die ganze
  // Queue-Seite zu leeren — sie entsteht waehrend `writeConfirmation` schreibt.
  const confirmed = candidateText !== null
    && ((): boolean => {
      try {
        return (JSON.parse(candidateText) as { confirmed?: boolean }).confirmed === true;
      } catch {
        return false;
      }
    })();
  // Die Umgebungsvariable ist die Wahl des Menschen (`jobs.modelReadRun`); ohne sie hat niemand
  // ein Modell benannt, gegen das sich ein fertiger Lauf vergleichen liesse.
  const model = process.env.CHESSLAB_MODEL_READ_RUN?.trim() || null;
  const freshPass = passSource !== null && stillCurrent(passSource, logStamp, null);
  const freshReads = readsSource !== null && stillCurrent(readsSource, logStamp, model);
  const otherModel = model !== null && readsSource?.model !== undefined
    && path.basename(readsSource.model) !== path.basename(model);
  // Die gespeicherte `coverage` ist ein Schnappschuss vom Matten, und `crop_square` schneidet
  // danach mit den NEUEN Ecken — gemessen 13 von 24 Aufnahmen. Nichts erinnerte daran.
  const staleMatte = matteStamps.some((stamp) => !sameLog(stamp, logStamp));
  const outdated: Partial<Record<ChainStep, string>> = {
    ...(staleMatte ? { matte: RECUT } : {}),
    ...(passSource !== null && !freshPass ? { temporal: STALE } : {}),
    ...(readsSource !== null && !freshReads
      ? { "model-read": otherModel ? `die Lesarten stammen von ${path.basename(readsSource!.model!)}, gelesen wird mit ${path.basename(model!)}` : STALE }
      : {}),
  };
  // Checked before the button is offered, not after ten minutes of replay. JEDES Segment: eine
  // Aufnahme ist bis zu elf Dateien, und der Export endet an einem fehlenden `moov` still.
  const broken = video ? await firstUnfinalized(video) : null;
  const state = {
    video,
    videoBroken: broken
      ? `${path.basename(broken)} hat keinen MP4-Index (moov) — die Aufnahme wurde abgebrochen, bevor der Recorder sie schliessen konnte`
      : null,
    offeredPgn: hasReference ? null : offeredPgn,
    hasReference,
    hasPhoneRecord,
    hasCandidate: candidateText !== null,
    confirmed,
    hasSession: session.exported,
    hasSettle: session.settled,
    mattes,
    hasTemporalPass: freshPass,
    hasModelReads: freshReads,
    outdated,
    useless,
  };
  return { ...state, ...nextStep(state) };
}

/** `null` heisst hier „nichts zu holen": keine Datei, oder eine, die gerade geschrieben wird. */
function sourceOf(text: string | null): Provenance | null {
  if (text === null) return null;
  try {
    return (JSON.parse(text) as { _source?: Provenance })._source ?? {};
  } catch {
    return null;
  }
}

/** Was die Sprosse wieder aufgemacht hat — der eine Fall, den reine Dateiexistenz nie sieht. */
const STALE = "der Lauf stammt von vor dem letzten Export — seine Zahlen gehoeren zu anderen Brettern";

/** Die Matte hat einen eigenen Satz: hier hilft kein zweiter SAM-Lauf, sondern die Arithmetik. */
const RECUT = "die Alphas wurden vor dem letzten Export geschnitten — `chesslab occluders recut-coverage` rechnet ihre Coverage gegen die heutige Geometrie neu";

/**
 * The one step that can run now, and in einem Satz, warum.
 *
 * Order is the chain's own, with the confirm gate honoured: `export-session` reads
 * `reviewed_plies`, so an unconfirmed candidate has nothing for it to export, and offering the
 * button anyway would produce an empty session and a puzzled user. A game the human called
 * useless has no step at all — that is the whole point of the flag, and it is one click undone.
 * With a record on disk the phone already knows the moves; the replay is then the fallback button.
 */
export function nextStep(state: Omit<ChainState, "step" | "reason">): { step: ChainStep | null; reason: string } {
  const because = (step: ChainStep, reason: string) => ({ step, reason: state.outdated[step] ?? reason });
  if (state.useless) return { step: null, reason: "als nutzlos markiert — kein Schritt offen" };
  if (!state.hasCandidate) {
    return state.hasPhoneRecord
      ? because("phone-record", "das Handy hat die Zuege dieser Partie schon erkannt — uebernehmen spart das Replay")
      : because("label", "zu dieser Aufnahme gibt es noch keine Zugfolge");
  }
  if (!state.confirmed) return because("confirm", "die vorgeschlagenen Zuege hat noch niemand bestaetigt, und der Export liest nur bestaetigte");
  if (!state.hasSession) return because("export", "die bestaetigten Zuege sind noch nicht zu Brettbildern geschnitten");
  // Producer-Reihenfolge, nicht Kosmetik: ohne `settle_dev` legt `position-flags` nichts aus, und
  // eine leere Strittig-Lane sieht aus wie "alles unstrittig" statt wie "nie gemessen".
  if (!state.hasSettle) return because("settle-scan", "keine Zeile traegt `settle_dev` — ungemessen ist nicht unstrittig, die Strittig-Lane bliebe leer");
  // Before `model-read`, which needs a model picked by hand: the alphas need nothing but the
  // export. The bar is the run's TARGET, not the pile — 80 of 394 is the instruction carried out,
  // and a step waiting for the other 314 would strand the biggest sessions on this rung forever.
  // Auch gemeldete Frames AUSSERHALB des Haufens: `--reported` holt sie, aber sobald das Ziel
  // erfuellt war, bot die Kette den Schritt nicht mehr an und sie blieben unerreichbar. Nur die
  // OFFENEN: ein von SAM abgelehntes Frame bliebe sonst fuer immer der Grund, hier zu stehen.
  if (state.mattes.reportedOpen > 0) return because("matte", `${state.mattes.reportedOpen} von Hand gemeldete Frames sind noch nicht gemattet`);
  if (state.mattes.wanted > 0) return because("matte", `${state.mattes.wanted} von Hand zur Matte geschickte Frames sind noch nicht gemattet`);
  if (state.mattes.done < state.mattes.target) return because("matte", `${state.mattes.done} von ${state.mattes.target} verdeckten Frames sind gemattet`);
  // Die Zahl der Matten stimmt, ihre Herkunft nicht — sonst schloesse die Sprosse auf Alphas,
  // die zu anderen Ecken gehoeren, und der Rest der Kette lernte die Drift als Wahrheit.
  if (state.outdated.matte !== undefined) return { step: "matte", reason: state.outdated.matte };
  // After SAM, never before: the pass adopts what SAM has not cut and upserts where SAM found
  // nothing, so it needs SAM's rows on disk to know which is which.
  if (!state.hasTemporalPass) return because("temporal", "der Drei-Bilder-Sensor ist ueber diese Aufnahme noch nicht gelaufen");
  if (!state.hasModelReads) return because("model-read", "kein Modell hat die Zellen dieser Aufnahme gelesen");
  return { step: "labeln", reason: "alle Maschinenschritte sind durch — jetzt korrigiert der Mensch" };
}

/**
 * Copy the phone's PGN in as `reference.pgn` — the chain's default, run by `tick`, never a button.
 *
 * Never overwrites: an existing reference is a human's choice (uploaded by hand, or edited), and
 * the phone's own move list is exactly the thing the confirm screen exists to doubt — which is why
 * `referenceOrigin` has to say so wherever the adopted file is used.
 */
export async function adoptPgn(name: string): Promise<{ adopted: string } | { reason: string }> {
  const target = path.join(gameDir(name), "reference.pgn");
  if (await exists(target)) return { reason: "reference.pgn already exists — nothing was overwritten" };
  const source = await phonePgn(name);
  if (!source) return { reason: "the transfer carries no .pgn — the phone never finished a game for it" };
  await writeFile(target, await readFile(source, "utf8"), "utf8");
  return { adopted: path.basename(source) };
}

/**
 * Every offered PGN adopted, wherever the queue is read — there is no ticker to do it any more.
 * A refusal is remembered, not retried: it is the same news on every read until a human acts, and
 * silence about it is the defect (see `docs/labeling-ux/CONCEPT.md` §5).
 */
export async function adoptOffered(names: readonly string[]): Promise<void> {
  for (const name of names) {
    if (refusals.has(name)) continue;
    const adopted = await adoptPgn(name);
    if ("reason" in adopted) refusals.set(name, `PGN ${name}: ${adopted.reason}`);
  }
}

// Pinned so a hot reload cannot turn a remembered refusal back into work on every render.
const refusals: Map<string, string> = ((globalThis as { __chesslabAdoptFailed?: Map<string, string> }).__chesslabAdoptFailed ??= new Map());

export function adoptFailures(): string[] {
  return [...refusals.values()];
}

/** A press is the human answering the refusal: ask again on the next read of the queue. */
export function clearAdoptFailures(): void {
  refusals.clear();
}

/** `phone` = the reference IS the phone's own move list, so confirming is a self-check. */
export type ReferenceOrigin = "none" | "phone" | "outside";

const md5 = (bytes: Buffer) => createHash("md5").update(bytes).digest("hex");

/**
 * Where `reference.pgn` came from, by digest against every `files/games/*.pgn`.
 *
 * The same test `realgames.reference_is_the_phones_own` makes — deliberately not a second
 * definition, because `chesslab realgames confirm --yes` REFUSES on `phone` and a screen that drew
 * the line elsewhere would wave through what the CLI blocks.
 */
export async function referenceOrigin(name: string): Promise<ReferenceOrigin> {
  const dir = gameDir(name);
  let digest: string;
  try {
    digest = md5(await readFile(path.join(dir, "reference.pgn")));
  } catch {
    return "none";
  }
  const games = path.join(dir, "files", "games");
  let pgns: string[] = [];
  try {
    pgns = (await readdir(games)).filter((f) => f.endsWith(".pgn"));
  } catch {
    return "outside"; // no bundle to have written it
  }
  for (const file of pgns) {
    if (md5(await readFile(path.join(games, file))) === digest) return "phone";
  }
  return "outside";
}
