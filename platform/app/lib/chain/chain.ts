/** The ladder from a transferred recording to the labelling stream, as a STATE: each step's input
 *  is the previous file, so the next step is read off the disk — never offered before it exists. */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { gameDir, peekCandidate } from "@/lib/session-store/recordings";
import { hasReferenceFile, writeReferenceOnce } from "@/lib/session-store/reference";
import { dataDir } from "@/lib/session-store/recordings";
import { videoInput } from "@/lib/ingest/ingest";
import { type MatteCensus, matteTarget } from "@/lib/session-store/matte";
import { absentOnly } from "@/lib/measurement";
import { pyCall } from "@/lib/py/worker";
import { firstUnfinalized } from "@/lib/ingest/mp4";
import { type UselessFlag, uselessFlag } from "@/lib/session-store/useless";

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
  /** Alphas on disk, the occluded pile, and what one run targets of it (`lib/session-store/matte.ts`). */
  mattes: MatteCensus;
  /** `session temporal-pass` ran to its end: `data/reports/temporal-mattes/<name>/pass.json`. */
  hasTemporalPass: boolean;
  /** Der Pass gilt, traegt aber kein `_inputs`: ob seither SAM-Zeilen dazukamen, weiss niemand. */
  passInputsUnknown?: boolean;
  /** Bestaetigt, aber ohne Stempel, gegen welche `reference.pgn` — die Bestaetigung gilt weiter. */
  confirmRefUnknown?: boolean;
  hasModelReads: boolean;
  /** Sprossen, deren Datei zwar daliegt, deren `_source` aber nicht mehr zur `log.jsonl` passt,
   *  je mit dem Satz, der sagt warum. */
  outdated: Partial<Record<ChainStep, string>>;
  /** The human's "nutzlos" verdict, active only — see `lib/session-store/useless.ts`. */
  useless: UselessFlag | null;
};

/** Dieselbe Antwort wie der Job (`ingest.videoInput`), sonst bietet die Kette einen toten Knopf an. */
async function videoOf(name: string): Promise<string | null> {
  const found = await videoInput(name);
  return "video" in found ? found.video : null;
}

/** `chain_state.chain_status` (Python): was die Kette von der Platte liest und Python schon rechnet
 *  — Export, Matte-Census, die Herkunftsstempel der Laeufe und `confirmedAgainst`. */
type PyChain = {
  session: { exported: boolean; settled: boolean; interrupted: boolean };
  mattes: MatteCensus;
  staleMatte: boolean;
  pass: { state: "absent" | "fresh" | "stale" | "matte_moved" | "input_moved"; inputs_known: boolean };
  reads: { state: "absent" | "fresh" | "stale" | "other_model"; model: string | null };
  against: "same" | "moved" | "unknown" | null;
};

/** Exactly one session directory, because the verb refuses several: with two, the record names one
 *  and the video is the other's. `index.json` is the phone's list of records, not a record. */
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

/** Jede Aufnahme einer Seite in EINER Worker-Anfrage — die Startseite fragt alle 51. */
export async function chainStates(names: readonly string[]): Promise<ChainState[]> {
  // Die Namen werden VOR dem Promise.all geprueft: sonst lehnen schon gestartete Leser unbeobachtet ab.
  for (const name of names) gameDir(name);
  if (names.length === 0) return [];
  // Ohne die Umgebungsvariable hat niemand ein Modell benannt, gegen das sich ein Lauf vergleichen liesse.
  const model = process.env.CHESSLAB_MODEL_READ_RUN?.trim() || null;
  // Die Node-Lesungen laufen NEBEN der Python-Anfrage; zurueck erst, wenn Python fertig ist — sonst
  // haelt der Worker nach einem Node-Fehler noch Dateien offen (Windows: EBUSY beim Aufraeumen).
  const py = pyCall<Record<string, PyChain>>(
    "chain_status", { root: dataDir(), names, target: matteTarget(), model });
  try {
    return await Promise.all(names.map((name) => stateOf(name, py.then((all) => all[name]), model)));
  } finally {
    await py.catch(() => undefined);
  }
}

export async function chainState(name: string): Promise<ChainState> {
  return (await chainStates([name]))[0];
}

async function stateOf(name: string, pending: Promise<PyChain>, model: string | null): Promise<ChainState> {
  const [video, offeredPgn, hasReference, hasPhoneRecord, candidate, useless, py] = await Promise.all([
    videoOf(name),
    phonePgn(name),
    hasReferenceFile(name),
    phoneRecord(name),
    peekCandidate(name),
    uselessFlag(name),
    pending,
  ]);
  // Eine halb geschriebene `candidate.json` ist "noch nicht bestaetigt" (`peekCandidate`).
  const confirmed = candidate?.doc?.confirmed === true;
  const against = confirmed ? py.against : null;
  const pass = py.pass.state;
  const outdated: Partial<Record<ChainStep, string>> = {
    ...(against === "moved" ? { confirm: REFERENCE_MOVED } : {}),
    ...(py.session.interrupted ? { export: EXPORT_INTERRUPTED } : {}),
    ...(py.staleMatte ? { matte: RECUT } : {}),
    ...(PASS_MOVED[pass] ? { temporal: PASS_MOVED[pass] } : {}),
    ...(py.reads.state === "stale" ? { "model-read": STALE } : {}),
    ...(py.reads.state === "other_model"
      ? { "model-read": `die Lesarten stammen von ${py.reads.model}, gelesen wird mit ${path.basename(model!)}` }
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
    hasCandidate: candidate !== null,
    confirmed,
    hasSession: py.session.exported,
    hasSettle: py.session.settled,
    mattes: py.mattes,
    hasTemporalPass: pass === "fresh",
    passInputsUnknown: pass === "fresh" && !py.pass.inputs_known,
    confirmRefUnknown: against === "unknown",
    hasModelReads: py.reads.state === "fresh",
    outdated,
    useless,
  };
  return { ...state, ...nextStep(state) };
}

const STALE = "der Lauf stammt von vor dem letzten Export — seine Zahlen gehoeren zu anderen Brettern";

const MATTE_MOVED = "seit dem Lauf hat sich die matte.jsonl geaendert — Frames, auf denen SAM nichts fand, hat kein Upsert gesehen";

const INPUT_MOVED = "seit dem Lauf haben sich Profil oder session.yaml geaendert — sein Scan gehoert zu anderer Geometrie";

const REFERENCE_MOVED = "die Referenz wurde nach der Bestaetigung ersetzt — die Zuege sind gegen eine andere Partie beurteilt";

const EXPORT_INTERRUPTED = "ein Export wurde abgebrochen (`.export-running`) — Bretter und Log stammen aus verschiedenen Laeufen, erst ein neuer Export gibt die Folgeschritte frei";

const RECUT = "die Alphas wurden vor dem letzten Export geschnitten — `chesslab occluders recut-coverage` rechnet ihre Coverage gegen die heutige Geometrie neu";

/** Warum ein Lauf nicht mehr gilt, je Zustand, den Python meldet. */
const PASS_MOVED: Partial<Record<PyChain["pass"]["state"], string>> = { stale: STALE, matte_moved: MATTE_MOVED, input_moved: INPUT_MOVED };

/** The one step that can run now, and why. `export-session` reads `reviewed_plies`, so an
 *  unconfirmed candidate would export an empty session. A useless game has no step at all. */
export function nextStep(state: Omit<ChainState, "step" | "reason">): { step: ChainStep | null; reason: string } {
  const because = (step: ChainStep, reason: string) => ({ step, reason: state.outdated[step] ?? reason });
  if (state.useless) return { step: null, reason: "als nutzlos markiert — kein Schritt offen" };
  if (!state.hasCandidate) {
    return state.hasPhoneRecord
      ? because("phone-record", "das Handy hat die Zuege dieser Partie schon erkannt — uebernehmen spart das Replay")
      : because("label", "zu dieser Aufnahme gibt es noch keine Zugfolge");
  }
  if (!state.confirmed) return because("confirm", "die vorgeschlagenen Zuege hat noch niemand bestaetigt, und der Export liest nur bestaetigte");
  // Die Bestaetigung bleibt stehen; nur die Sprosse geht auf, bis ein Mensch gegen die neue urteilt.
  if (state.outdated.confirm !== undefined) return { step: "confirm", reason: state.outdated.confirm };
  if (!state.hasSession) return because("export", "die bestaetigten Zuege sind noch nicht zu Brettbildern geschnitten");
  // Producer-Reihenfolge, nicht Kosmetik: ohne `settle_dev` legt `position-flags` nichts aus, und
  // eine leere Strittig-Lane sieht aus wie "alles unstrittig" statt wie "nie gemessen".
  if (!state.hasSettle) return because("settle-scan", "keine Zeile traegt `settle_dev` — ungemessen ist nicht unstrittig, die Strittig-Lane bliebe leer");
  // The bar is the run's TARGET, not the pile — waiting for all of it would strand the biggest
  // sessions here forever. Reported frames outside the pile count too, but only OPEN ones: a frame
  // SAM refused would otherwise hold the rung forever.
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

/** Never overwrites: an existing reference is a human's choice, and the phone's own move list is
 *  exactly what the confirm screen exists to doubt. */
export async function adoptPgn(name: string): Promise<{ adopted: string } | { reason: string }> {
  if (await hasReferenceFile(name)) return { reason: "reference.pgn already exists — nothing was overwritten" };
  const source = await phonePgn(name);
  if (!source) return { reason: "the transfer carries no .pgn — the phone never finished a game for it" };
  if (!(await writeReferenceOnce(name, await readFile(source, "utf8")))) {
    return { reason: "reference.pgn appeared while adopting — nothing was overwritten" };
  }
  return { adopted: path.basename(source) };
}

/** A refusal is remembered, not retried: it is the same news on every read until a human acts. */
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

