/**
 * The lanes of the LABELN stream (CONCEPT.md 4.2) — pure, so the stream's client half can import
 * it (`lib/client-boundary.test.ts`).
 *
 * A lane is a FILTER over one stream, never a page. The chip prints ONE number, because the only
 * question it answers is whether work is left ("da reicht eine zahl", User 2026-08-18); the unit
 * and the denominator moved into its tooltip. A lane the producer has not filled yet prints `—`
 * with its reason — `0` would claim there is no such work when nobody has been asked.
 */

import { PIECE_VISIBLE_MAX, coveragePct, isIdentity } from "@/lib/classes";
import { fenLabels } from "@/lib/fen";
import type { FrameHand } from "@/lib/frame-hands";
import type { LabelStream, StreamBoard, StreamPositionCell } from "@/lib/label-stream";
import type { QueryHit } from "@/lib/query";

export type LaneId = "audit" | "control" | "all" | "frames";

/** A board lane paints the 8x8; a cell lane renders the crop grid, grouped by square (REVIEW S10);
 *  a frame lane judges the WHOLE picture and writes no label at all. */
type LaneRenderer = "board" | "cells" | "frames";
type LaneUnit = "Bretter" | "Zellen" | "Frames";

export type Lane = {
  id: LaneId;
  /** Its own URL segment under `/strom/labeln` — a lane is a place, so Back and a bookmark work. */
  slug: string;
  label: string;
  renderer: LaneRenderer;
  unit: LaneUnit;
  /** What the count is measured against — the chip's tooltip, never the chip itself. */
  denominator: string;
};

/** Was die Frame-Lane zeigt — als Satz, damit die Wahl auf dem Schirm steht und nicht in einem
 *  Filter: dirty ohne `occluded`, also genau das, was heute niemand anfasst. */
export const FRAME_LANE_SET =
  "dirty Frames OHNE `occluded` — stale, changed, grid-late: weder SAM noch der Slice fasst sie an";

/**
 * DREI Lanes, nach der FRAGE geschnitten, nicht nach dem Produzenten (2026-09-07). Neun Lanes
 * waren neun Herkuenfte derselben drei Fragen, und benutzt wurden zwei („ich verstehe die schon
 * gar nicht mehr"). Wer die Herkunft braucht, liest sie auf der Karte: jede traegt ihre Notiz.
 */
export const LANES: readonly Lane[] = [
  {
    id: "audit",
    slug: "audit",
    label: "Strittig",
    renderer: "cells",
    unit: "Zellen",
    denominator: "Zellen, die ein Messer angezweifelt hat",
  },
  {
    id: "control",
    slug: "stichprobe",
    label: "Stichprobe",
    renderer: "cells",
    unit: "Zellen",
    // Its own corpus, and it renews: the draw is a fresh one over the still UNBEURTEILTEN quiet
    // cells of every exported session, not a fixed list that retires once it is answered.
    denominator: "Kontroll-Stichprobe über die noch unbeurteilten ruhigen Zellen der exportierten Sessions",
  },
  {
    id: "frames",
    slug: "frames",
    label: "Strittige Frames",
    renderer: "frames",
    unit: "Frames",
    denominator: FRAME_LANE_SET,
  },
  {
    id: "all",
    slug: "alle",
    label: "Bretter",
    renderer: "board",
    unit: "Bretter",
    denominator: "Bretter im Strom",
  },
];

/**
 * Der Stapel, ueber den nie jemand entschieden hat: dirty, aber NICHT `occluded`. SAM mattet nur
 * `occluded` (`matte.alpha_worker --reason`), und ohne Matte laesst `slice_session` jede Zelle
 * eines dirty Frames fallen — 1 179 Frames in 28 Aufnahmen (`stale` 978, `changed` 177,
 * `grid-late` 24) liegen damit still auf der Platte. `occluded` hat seinen Weg schon.
 */
/** Der Pinsel „unbrauchbar" der Zell-Lane, mit seiner Taste — der Strom und die Lane laden ihn
 *  von hier, damit die Tastatur und die Palette nicht auseinanderlaufen (wie `DIRTY_BRUSH`). */
export const UNUSABLE_BRUSH = "unbrauchbar";
export const UNUSABLE_KEY = "u";

export function frameCandidate(board: StreamBoard): boolean {
  return board.dirtyReason !== undefined && board.dirtyReason !== "occluded";
}

export const laneById = (id: LaneId): Lane => LANES.find((l) => l.id === id)!;
export const laneBySlug = (slug: string): Lane | undefined => LANES.find((l) => l.slug === slug);
export const DEFAULT_LANE = LANES[0];
export const lanePath = (id: LaneId) => `/strom/labeln/${laneById(id).slug}`;

/** Why a lane is empty, when it is empty because nobody produced its input yet. */
export const NO_READS =
  "keine Modell-Lesarten auf der Platte — `chesslab realgames model-read <name> --model <run>` " +
  "lief noch nicht. Das heißt „noch nicht gefragt“, nicht „nichts gefunden“ (CONCEPT.md D2).";
export const NO_QUERY =
  "/api/query hat nicht geantwortet — die Klassenwand ist eine serverseitige Abfrage, und ohne " +
  "ihre Antwort ist die Zahl unbekannt, nicht null.";
export const NO_AUDIT =
  "data/reports/audit-flags.jsonl fehlt — der Zwei-Hälften-Kreuztest lief noch nicht.";
export const NO_HAND =
  "data/reports/hand-flags.jsonl fehlt — `chesslab realgames hand-flags` lief noch nicht.";
export const NO_POSITION =
  "data/reports/position-flags.jsonl fehlt — `chesslab session settle-scan` und danach " +
  "`chesslab realgames position-flags` liefen noch nicht. Ohne Messung ist eine Zelle nicht " +
  "unstrittig, sondern ungemessen.";
export const NO_SETTLE_SCAN =
  "auf diesen Aufnahmen lief `chesslab session settle-scan` nie — sie tragen null Stellungs-" +
  "Karten, weil niemand gemessen hat, nicht weil nichts strittig war:";

/**
 * Was der Strittig-Lane gerade FEHLT. Eine schweigende Quelle darf nicht in der Summe verschwinden:
 * die Zahl waere sonst „so viel ist strittig", wo sie „so viel ist strittig, gemessen an dem, was
 * gelaufen ist" heisst. Leer heisst deshalb `—` mit Grund, teilweise heisst Zahl mit Fussnote.
 */
function missingSources(stream: LabelStream, wall?: WallQuery): string[] {
  const out: string[] = [];
  if (stream.audit === null) out.push(NO_AUDIT);
  if (stream.positions === null) out.push(NO_POSITION);
  if (stream.hands === null) out.push(NO_HAND);
  if (!stream.sessions.some((s) => s.probs)) out.push(NO_READS);
  else if (!wall) out.push(NO_QUERY);
  return out;
}

/** What an empty lane says. Only the Stichprobe can run DRY — it redraws over the unjudged cells,
 *  so nothing left there means the corpus is through, not that no work has arrived yet. */
export const laneEmpty = (id: LaneId): string =>
  id === "control"
    ? "Stichprobe erschöpft — jede ruhige Zelle des Korpus trägt ein Urteil."
    : id === "frames"
      ? "Kein strittiges Frame offen — jedes trägt ein Urteil oder schon eine Matte."
      : "Diese Lane ist leer — nichts wartet hier auf ein Urteil.";

export type LaneCount = {
  /** OPEN items — the stream shows nothing else. `null` = the producer owes this lane its input. */
  n: number | null;
  why?: string;
  /** Everything the lane holds, judged or not, so `n` can never be read as the whole corpus. */
  total?: number;
  /** Counted from the stream when the static wording cannot say it — "… über 18 Bundles". */
  denominator?: string;
};

/** ONE number — is there anything left here. What it is measured against is the tooltip's job. */
export function laneChip(lane: Lane, count: LaneCount): { text: string; title: string } {
  const over = count.denominator ?? lane.denominator;
  if (count.n === null) return { text: `${lane.label} —`, title: count.why ?? "kein Input auf der Platte" };
  const total = count.total ?? count.n;
  return {
    text: `${lane.label} ${count.n}`,
    title: `${count.n} offen von ${total} ${lane.unit} · ${over}`,
  };
}

/**
 * Where a lane switch lands: the first item at or after the position you were on.
 *
 * "Switching a lane keeps you in place" (CONCEPT.md 4.2) — every item carries the same ordinal, so
 * a switch is a search in that order, never a reset to the top; past the end the last item is the
 * honest answer. By VALUE, because a cell lane is grouped by square and its ordinals do not ascend.
 */
export function keepPosition(positions: readonly number[], at: number): number {
  if (positions.length === 0) return 0;
  const ahead = positions.filter((p) => p >= at);
  return positions.indexOf(ahead.length > 0 ? Math.min(...ahead) : Math.max(...positions));
}

/**
 * Cells of one lane, grouped BY SQUARE inside a session (REVIEW S10) while the sessions stay
 * sequential. Score order scattered a square's six crops over six pages ("ich sehe
 * immer noch alte Bilder", 2026-08-09); the stream's session order is the outer key.
 */
export function groupBySquare<T extends { session: number; square: string; stem: string }>(cells: T[]): T[] {
  return [...cells].sort(
    (a, b) => a.session - b.session || a.square.localeCompare(b.square) || a.stem.localeCompare(b.stem),
  );
}

/**
 * How far apart two crops may sit and still be "the same event" (kept for the phone mode of
 * CONCEPT.md 4.3). A resting hand produces forty identical cards otherwise, the failure that
 * killed the tinder band.
 */
export const GROUP_SPAN = 150;

/**
 * What SAM measured on ONE crop, as its card prints it. A page mixes frames and sessions, so the
 * lookup takes the whole map; `null` covers both "no alpha was ever cut here" and "nothing worth
 * printing", because a card has no room to tell those apart — the lane head's chip does.
 */
export function cellCoverage(
  coverage: Record<string, Record<string, number> | undefined>[],
  cell: { session: number; stem: string; square: string },
): string | null {
  const value = coverage[cell.session]?.[cell.stem]?.[cell.square];
  return value === undefined ? null : coveragePct(value);
}

/**
 * Die Hand liegt am BRETT, aber nicht auf diesem Feld — dem Crop sieht man das nicht an, und der
 * FEN eines Frames mitten im Griff ist so belastbar wie die Stellung darunter (User, 2026-09-12).
 * `null` heisst "keine Hand ODER nie gescannt"; welches von beiden, sagt `handScanned`.
 */
export function handBeside(
  hands: Record<string, FrameHand>[],
  coverage: Record<string, Record<string, number> | undefined>[],
  cell: { session: number; stem: string; square: string },
): FrameHand | null {
  const hand = hands[cell.session]?.[cell.stem];
  if (!hand) return null;
  return (coverage[cell.session]?.[cell.stem]?.[cell.square] ?? 0) > PIECE_VISIBLE_MAX ? null : hand;
}

/**
 * `true`, wenn fuer diese Aufnahme NIE ein Hand-Scan lief — dann ist ein fehlender Stem keine
 * Aussage. CLAUDE.md: ohne Messung ist eine Zelle nicht unbedenklich, sondern ungemessen.
 */
export function handsUnmeasured(scanned: boolean[], cell: { session: number }): boolean {
  return scanned[cell.session] !== true;
}

export type LaneCell = {
  session: number;
  pos: number;
  stem: string;
  square: string;
  fen_label: string;
  /** What one keypress writes here, and into which ledger — the two are never guessed at the call site. */
  label: string;
  ledger: "corrections" | "reviewed";
  /** What a marked cell writes instead; `null` leaves it open for a board lane. */
  exception: string | null;
  caption: string;
  note?: string;
};

/**
 * The identity lanes ask the human to rule on a MODEL's word, so the one-key verdict is "FEN
 * stimmt" and the model's read costs a click: ~51 % of the flags are false alarms (Northcutt 2021,
 * CONCEPT.md 4.2) and no page of 60 may write a model's guess into training input by default.
 */
function judgedCell(c: {
  session: number; pos: number; stem: string; square: string; fen_label: string;
  predicted: string;
}): LaneCell {
  // Only one of the 13: `occluded` is measured now and `validate` rejects it, so offering it as
  // "das Modell hat recht" would 400 the whole page instead of writing one row.
  const predicted = isIdentity(c.predicted) ? c.predicted : null;
  return {
    session: c.session,
    pos: c.pos,
    stem: c.stem,
    square: c.square,
    fen_label: c.fen_label,
    label: c.fen_label,
    ledger: "reviewed",
    exception: predicted,
    caption: `${c.square} · FEN ${c.fen_label}`,
    ...(predicted ? { note: `Modell ${predicted}` } : {}),
  };
}

/**
 * Eine Behauptung pro Seite, wie im Audit: FEN-Gruppe → Modell-Wort, größte zuerst. Innerhalb der
 * Untergruppe Feld+Frame statt Score — Score-Ordnung verstreute die sechs Crops eines Feldes über
 * sechs Seiten („ich sehe immer noch alte Bilder", 2026-08-09), und DIE Lektion bleibt.
 */
function byClaim(cells: LaneCell[]): LaneCell[] {
  const group = new Map<string, number>();
  const sub = new Map<string, number>();
  for (const c of cells) {
    group.set(c.fen_label, (group.get(c.fen_label) ?? 0) + 1);
    const key = `${c.fen_label}|${c.exception ?? ""}`;
    sub.set(key, (sub.get(key) ?? 0) + 1);
  }
  return [...cells].sort(
    (a, b) =>
      (group.get(b.fen_label) ?? 0) - (group.get(a.fen_label) ?? 0) ||
      a.fen_label.localeCompare(b.fen_label) ||
      (sub.get(`${b.fen_label}|${b.exception ?? ""}`) ?? 0) - (sub.get(`${a.fen_label}|${a.exception ?? ""}`) ?? 0) ||
      (a.exception ?? "").localeCompare(b.exception ?? "") ||
      a.square.localeCompare(b.square) ||
      a.stem.localeCompare(b.stem),
  );
}

/** The `Klassenwand` answer as the lane sees it: its cells, and the question that produced them. */
export type WallQuery = { cells: LaneCell[]; text: string };

/**
 * The query's hits placed IN THE STREAM — the server answers with session ids and frame stems, the
 * ordinal and the FEN come from the boards the stream already carries. A hit on a board no lane
 * shows (unusable, thrown out) has no ordinal and drops here rather than being answered off-screen.
 */
export function wallCells(hits: readonly QueryHit[], stream: LabelStream): LaneCell[] {
  const index = new Map(stream.sessions.map((s, i) => [s.sessionId, i]));
  const boards = new Map(stream.boards.map((b) => [`${b.session}|${b.stem}`, b]));
  const out: LaneCell[] = [];
  for (const hit of hits) {
    const session = index.get(hit.session);
    if (session === undefined) continue;
    const board = boards.get(`${session}|${hit.stem}`);
    if (!board) continue;
    const fen = fenLabels(board.fen);
    for (const square of hit.squares) {
      out.push(
        judgedCell({
          session,
          pos: board.pos,
          stem: hit.stem,
          square,
          fen_label: fen[square] ?? "empty",
          predicted: hit.accept[square] ?? "",
        }),
      );
    }
  }
  return out;
}

/** Die Zellen der Hand-Lane: kein Klassenwort und kein `exception` — die einzige Antwort ist der
 *  Dirty-Pinsel, und ⏎ sagt "keine Hand", also bestaetigt es das FEN-Wort von der Platte. */
function handCells(stream: LabelStream): LaneCell[] {
  return byClaim(groupBySquare(
    (stream.hands ?? []).map((c) => ({
      session: c.session,
      pos: c.pos,
      stem: c.stem,
      square: c.square,
      fen_label: c.fen_label,
      label: c.fen_label,
      ledger: "reviewed" as const,
      exception: null,
      caption: `${c.square} · Modell ${(c.model_cov * 100).toFixed(0)} % verdeckt`,
      note: c.matte_cov === null ? "Hand? Matte kennt dieses Frame nicht" : `Hand? Matte ${(c.matte_cov * 100).toFixed(0)} %`,
    })),
  ));
}

/**
 * Die Gründe der Stellungs-Karten, in der Reihenfolge, in der die Lane sie zeigt. Sie stellen
 * VERSCHIEDENE Fragen — „steht da etwas anderes" gegen „gilt der Zug hier schon" —, und nach Feld
 * sortiert lagen sie auf einer Seite gemischt (User, 2026-09-12). Unbekannte Gründe hinten.
 */
const POSITION_REASONS = ["changed", "temporal", "timing", "unreadable"];
const reasonRank = (reason: string) => {
  const i = POSITION_REASONS.indexOf(reason);
  return i === -1 ? POSITION_REASONS.length : i;
};

function positionCell(c: StreamPositionCell): LaneCell {
  return {
    session: c.session,
    pos: c.pos,
    stem: c.stem,
    square: c.square,
    fen_label: c.fen_label,
    label: c.fen_label,
    ledger: "corrections" as const,
    exception: null,
    caption: `${c.square} · FEN ${c.fen_label}`,
    note: c.reason === "temporal"
      ? `Bildabweichung ${c.temporal_score?.toFixed(2) ?? "?"} · Hand oder Stellung prüfen`
      // `timing` fragt nicht "steht da etwas anderes", sondern "gilt der Zug hier schon".
      : c.reason === "timing" ? `Zug-Zeitpunkt · schon gezogen oder noch nicht?`
      : c.reason === "unreadable" ? "Stellung? kaum Feld zu sehen" : `Stellung? Δ ${c.dev.toFixed(0)}`,
  };
}

/** Die Stellungs-Zellen: ⏎ bestaetigt den FEN (Schatten-Fehlalarm), die Palette schreibt die Figur,
 *  die wirklich dasteht. Deshalb `corrections` — hier ist der FEN der Verdaechtige. */
function positionCells(stream: LabelStream): LaneCell[] {
  const groups = new Map<string, StreamPositionCell[]>();
  for (const row of stream.positions ?? []) {
    const list = groups.get(row.reason);
    if (list) list.push(row);
    else groups.set(row.reason, [row]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => reasonRank(a) - reasonRank(b) || a.localeCompare(b))
    .flatMap(([, rows]) => byClaim(groupBySquare(rows.map(positionCell))));
}

/**
 * Ist die Zelle ueberhaupt eine FRAGE? Ueber `PIECE_VISIBLE_MAX` maskiert der Occlusion-Verlust sie
 * aus der Klassifikation — was ein Mensch dort urteilt, lernt kein Kopf, und die Lane war voll
 * davon (User, 2026-09-07). Ohne Messung bleibt sie drin: ungemessen heisst nicht verdeckt.
 */
function visible(stream: LabelStream, cell: { session: number; stem: string; square: string }): boolean {
  return (stream.coverage[cell.session]?.[cell.stem]?.[cell.square] ?? 0) <= PIECE_VISIBLE_MAX;
}

/**
 * The cells of a cell lane, one claim per page. Empty for a board lane.
 *
 * `Strittig` is every measurer at once, BLOCK BY BLOCK and not interleaved: each source keeps its
 * own claim order, so a page stays one question even though the lane holds four.
 */
export function laneCells(stream: LabelStream, id: LaneId, wall?: WallQuery): LaneCell[] {
  if (id === "audit") {
    return [
      ...byClaim((stream.audit ?? []).map(judgedCell)),
      ...byClaim(groupBySquare(wall?.cells ?? [])),
      ...positionCells(stream),
      ...handCells(stream),
    ].filter((c) => visible(stream, c));
  }
  if (id !== "control") return [];
  // EIN ⏎ überall: „FEN stimmt" → reviewed. Ohne Modellwort, weil die Stichprobe blind sein muss.
  return byClaim(
    groupBySquare(stream.cells).map((c) => ({
      session: c.session,
      pos: c.pos,
      stem: c.stem,
      square: c.square,
      fen_label: c.fen_label,
      label: c.fen_label,
      ledger: "reviewed" as const,
      exception: null,
      caption: `${c.square} · FEN ${c.fen_label}`,
    })),
  );
}

/**
 * Was schon beurteilt ist, juengste zuerst — was „Fertige zeigen" einer Zell-Lane VORANSTELLT.
 *
 * Nicht die Lane selbst: die Stichprobe zieht per Bauart nur aus den UNBEURTEILTEN Zellen, ein
 * bestaetigtes Feld waere dort also fuer immer weg. Der Rueckweg haengt deshalb am Ledger, nicht
 * an der Frage, und ist in jeder Lane derselbe.
 */
export function recentCells(stream: LabelStream): LaneCell[] {
  return stream.recent.map((c) => ({
    session: c.session,
    pos: c.pos,
    stem: c.stem,
    square: c.square,
    fen_label: c.fen_label,
    label: c.label,
    ledger: c.ledger,
    exception: null,
    caption: `${c.square} · FEN ${c.fen_label}`,
    note: `beurteilt ${new Date(c.ts).toLocaleString("de-DE")}`,
  }));
}

/** The boards of a board lane, in stream order. Empty for a cell lane. */
export function laneBoards(stream: LabelStream, id: LaneId): StreamBoard[] {
  return id === "all" ? stream.boards : [];
}

/**
 * `{square: label}` die Lane auf einem Brett vorwaehlt — alles, was jemand an DIESEM Brett
 * angezweifelt hat, in einer Vorwahl. Reihenfolge = Schaerfe: der Regelbruch beweist einen
 * Widerspruch, `unknown` ist nur die Zweifel des Exporters, und die Modell-Lesart ist eine Meinung.
 *
 * `unknown` traegt das FEN-Wort, weil `labeling.py` die Zelle sonst beim Slice faellen laesst —
 * das FEN zu bestaetigen ist hier die Rettung, nicht eine Tautologie (CONCEPT.md D5).
 */
export function laneAccept(board: StreamBoard, id: LaneId): Record<string, string> {
  if (id !== "all") return {};
  const fen = fenLabels(board.fen);
  return {
    ...board.disagree,
    ...Object.fromEntries(board.unknown.map((sq) => [sq, fen[sq] ?? "empty"])),
    ...board.violating,
  };
}

export function laneReads(board: StreamBoard, id: LaneId): Record<string, string> {
  return id === "all" ? board.disagreeReads : {};
}

/**
 * A board lane's flagged squares as single crops — the phone renders one crop, never an 8x8
 * (CONCEPT.md 4.3), so every lane has to be answerable cell by cell.
 */
export function boardCells(boards: readonly StreamBoard[], id: LaneId): LaneCell[] {
  return groupBySquare(
    boards.flatMap((board) => {
      const fen = fenLabels(board.fen);
      const reads = laneReads(board, id);
      return Object.entries(laneAccept(board, id)).map(([square, label]) => ({
        session: board.session,
        pos: board.pos,
        stem: board.stem,
        square,
        fen_label: fen[square] ?? "empty",
        label,
        ledger: "corrections" as const,
        exception: null,
        caption: `${square} ${reads[square] ?? label}`,
      }));
    }),
  );
}

/**
 * A board still worth stopping at — the lane's own unit of work, unanswered.
 *
 * `Alle Bretter` is free-hand touch-up and closes only when every square carries a verdict.
 * `Regelbruch` never closes: its squares are corrections ON FILE, so the ledger calls them judged
 * by construction — the board leaves the lane when the audit runs again and drops its row.
 */
export function laneOpen(board: StreamBoard, id: LaneId, decided: Record<string, string>): boolean {
  if (id !== "all") return false;
  // Ein Brett mit Regelbruch bleibt IMMER offen: seine markierten Felder sind Korrekturen auf der
  // Platte, das Ledger nennt sie also von Bauart her beurteilt. Es geht erst, wenn der Audit neu
  // laeuft und die Zeile faellt. Sonst zaehlen die 64 Felder — Freihand schliesst nur ganz.
  if (board.violations.length > 0) return true;
  return Object.keys(fenLabels(board.fen)).some((sq) => decided[`${board.stem}|${sq}`] === undefined);
}

/**
 * Liefert dieses Brett noch einen Crop? `slice_session`: mit Settle-Messung UND Matte entscheidet
 * die Zelle, sonst wird nur ein `occluded` Frame mit Matte gerettet und jedes andere dirty Frame
 * nur noch da, wo ein Mensch etwas benannt hat. Fehlende `phase` heißt NICHT dirty — sonst
 * blendet ein ungemessenes Brett sich selbst aus.
 */
export function reachesPool(board: StreamBoard, coverage: Record<string, Record<string, number> | undefined>[]): boolean {
  if (board.phase !== "after" && board.phase !== "before") return true;
  const cover = coverage[board.session]?.[board.stem];
  if (cover === undefined || Object.keys(cover).length === 0) return false;
  return board.settleMeasured === true || board.dirtyReason === "occluded";
}

/**
 * What the lane still asks for, against the ledger AS LOADED.
 *
 * The server's snapshot and not the live overlay: an item answered in this sitting must keep its
 * place until the next load, or the list would resize under the cursor on every commit and `z`
 * would land somewhere else than it took the row from.
 */

/** Jedes strittige Frame des Korpus, beurteilt oder nicht — der Nenner der Lane. */
export function laneFrames(stream: LabelStream, id: LaneId): StreamBoard[] {
  return id === "frames" ? stream.boards.filter(frameCandidate) : [];
}

/**
 * Was noch auf ein Urteil wartet. Ein Frame geht raus, sobald es EINES von beiden traegt: zur
 * Matte geschickt (der Zettel bleibt liegen, auch bevor SAM lief) oder schon gemattet — dann
 * gehoeren seine Zellen der Strittig-Lane. `unusable` kommt gar nicht erst im Strom an: die Zeile
 * traegt das Flag, und `loadLabelStream` laesst sie fallen.
 */
export function openFrames(stream: LabelStream, id: LaneId): StreamBoard[] {
  return laneFrames(stream, id).filter(
    (b) =>
      !(stream.sessions[b.session]?.matteWanted ?? []).includes(b.stem) &&
      // Eine ABSAGE ist keine Matte: es liegt kein Alpha da, die Zellen erreichen die
      // Strittig-Lane nie, und ohne diese Zeile verschwindet die Frage aus beiden Lanes.
      (stream.coverage[b.session]?.[b.stem] === undefined
        || stream.skipped[b.session]?.[b.stem] !== undefined),
  );
}

export function openBoards(stream: LabelStream, id: LaneId): StreamBoard[] {
  return laneBoards(stream, id).filter(
    (b) => reachesPool(b, stream.coverage) && laneOpen(b, id, stream.decided[b.session] ?? {}),
  );
}

export function openCells(stream: LabelStream, id: LaneId, wall?: WallQuery): LaneCell[] {
  const alive = new Set(
    stream.boards.filter((b) => reachesPool(b, stream.coverage)).map((b) => `${b.session}|${b.stem}`),
  );
  return laneCells(stream, id, wall).filter(
    (c) =>
      alive.has(`${c.session}|${c.stem}`) &&
      !isUnusableCell(stream, c) &&
      (stream.decided[c.session] ?? {})[`${c.stem}|${c.square}`] === undefined,
  );
}

/** „Aus diesem Crop ist kein Label zu holen" — ein Urteil wie jedes andere, nur dass es KEINE
 *  Klasse nennt. Die Zelle ist damit beantwortet und darf nicht wieder auf der Seite stehen. */
export function isUnusableCell(
  stream: LabelStream,
  cell: { session: number; stem: string; square: string },
): boolean {
  return (stream.unusableCells[cell.session] ?? []).includes(`${cell.stem}|${cell.square}`);
}

/** Open and total, or `null` with the reason every producer still owes this lane its input. */
export function laneCount(stream: LabelStream, id: LaneId, wall?: WallQuery): LaneCount {
  const missing = id === "audit" ? missingSources(stream, wall) : [];
  if (missing.length === 4) return { n: null, why: missing.join(" ") };
  if (id === "frames") return { n: openFrames(stream, id).length, total: laneFrames(stream, id).length };
  const board = laneById(id).renderer === "board";
  const total = board ? laneBoards(stream, id).length : laneCells(stream, id, wall).length;
  const n = board ? openBoards(stream, id).length : openCells(stream, id, wall).length;
  if (id === "audit") {
    // Ein Modell hat bisher EINE Session gelesen; der Rest des Korpus ist NICHT GEMESSEN, nicht
    // einig — deshalb steht neben der Zahl, worueber sie ueberhaupt gemessen wurde.
    const over =
      `Zellen aus Audit, Modell ≠ FEN (»${wall?.text ?? "keine Abfrage"}«, ` +
      `${stream.reads.boards} von ${stream.boards.length} Brettern gelesen), Stellung und Hand`;
    // Eine ungemessene Aufnahme faellt nicht in `missingSources`: die Datei IST da, sie schweigt
    // nur ueber diese Aufnahme. Die Nullschwelle des `n: null` oben darf sie deshalb nicht bewegen.
    const notes =
      stream.positionsUnmeasured.length > 0
        ? [...missing, `${NO_SETTLE_SCAN} ${stream.positionsUnmeasured.join(", ")}`]
        : missing;
    return { n, total, denominator: notes.length === 0 ? over : `${over} · ES FEHLT: ${notes.join(" ")}` };
  }
  return { n, total };
}

export type EventGroup<T> = { head: T; members: T[] };

/**
 * Collapse a square's run of crops into events: same square, same FEN word, frames within
 * [GROUP_SPAN]. The head is what the phone shows; a long press answers for the whole group.
 */
export function collapseEvents<T extends { session?: number; square: string; stem: string; fen_label: string }>(
  cells: T[],
): EventGroup<T>[] {
  const out: EventGroup<T>[] = [];
  for (const cell of cells) {
    const last = out[out.length - 1];
    const near =
      last !== undefined &&
      // Die Aufnahme gehoert in den Vergleich: Frame-Nummern fangen je Aufnahme neu an, und ein
      // langer Druck schriebe das Urteil sonst auf Crops, die niemand gesehen hat.
      last.head.session === cell.session &&
      last.head.square === cell.square &&
      last.head.fen_label === cell.fen_label &&
      Math.abs(Number(cell.stem) - Number(last.members[last.members.length - 1].stem)) <= GROUP_SPAN;
    if (near) last.members.push(cell);
    else out.push({ head: cell, members: [cell] });
  }
  return out;
}
