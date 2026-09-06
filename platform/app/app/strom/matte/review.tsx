"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlphaPenControls, AlphaPenLayer, useAlphaPen } from "@/components/alpha-pen";
import { BoardLegend, BoardSurface, useBoardPaint } from "@/components/board-paint";
import { Notice } from "@/components/notice";
import { PaletteRow } from "@/components/palette-row";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PIECE_VISIBLE_MAX } from "@/lib/classes";
import { fenLabels, moveLabel } from "@/lib/fen";
import type { Correction } from "@/lib/corrections";
import {
  carryPositionCorrections,
  type PositionPrefills,
  verifyFrameKey,
} from "@/lib/position-carry";
import type { ReviewNote } from "@/lib/review-notes";
import type { VerifyStream } from "@/lib/verify";

const TOUCH = "max-sm:h-11 max-sm:px-3";

/**
 * „Das Brett zeigt schon den neuen Zug": die Felder, in denen die Stellung NACH `next` von der
 * des Intervalls abweicht. Als Korrekturen, nicht als neuer FEN — `slice_session` liest genau
 * die, sie schlagen das Intervall-Label und heben den Frame ueber das dirty-Gate.
 */
function aheadCorrections(frame: { fen: string; next?: { fen: string } }): { square: string; label: string }[] {
  if (!frame.next) return [];
  const now = fenLabels(frame.fen);
  const then = fenLabels(frame.next.fen);
  return Object.entries(then)
    .filter(([square, label]) => now[square] !== label)
    .map(([square, label]) => ({ square, label }));
}

const KEYS: [string, string][] = [
  ["⏎", "Brett zeigt den ALTEN Zug → nächster"],
  ["⇧⏎", "Brett zeigt schon den NEUEN Zug → nächster"],
  ["u", "FEN unsicher (ganzes Intervall)"],
  ["m", "Alpha ein/aus"],
  ["p", "Pinsel · e malen/radieren · [ ] Größe · z zurück · s speichern"],
  ["← →", "Frame blättern"],
];

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
  return answer;
}

/**
 * Eine Frage pro Frame: stimmt die Stellung. Das Alpha wird seit 2026-08-22 nicht mehr abgefragt —
 * SAM 3s Schnitt ist in der Review bestätigt worden, und was er trotzdem verfehlt, korrigiert der
 * Pinsel hier. Verdeckte Felder bleiben ungelabelt: ihre `coverage` nimmt sie aus dem Loss.
 */
export function MatteReview({ stream }: { stream: VerifyStream }) {
  const router = useRouter();
  const [at, setAt] = useState({ key: "", index: 0 });
  const [alpha, setAlpha] = useState(true);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [painted, setPainted] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState<PositionPrefills>({});
  const [carryNotice, setCarryNotice] = useState<{
    session: number;
    ply: number;
    count: number;
  } | null>(null);

  const frames = stream.frames;
  /**
   * Die Position hängt am FRAME, nicht am Index. Der alpha-worker legt alle ~12 s eine Zeile
   * nach; über einen Index würde die neue Liste den Menschen mitten im Strich auf ein anderes
   * Brett schieben („nervt, wenn ich die alpha anmale", 2026-08-19).
   */
  const found = frames.findIndex((f) => verifyFrameKey(f) === at.key);
  const index = Math.max(0, found >= 0 ? found : Math.min(at.index, frames.length - 1));
  const frame = frames[index];
  const session = frame ? stream.sessions[frame.session] : undefined;
  const key = frame ? verifyFrameKey(frame) : "";
  const decided = frame ? (stream.decided[frame.session] ?? {}) : {};

  const paint = useBoardPaint({
    boardKey: key,
    fen: frame?.fen ?? "8/8/8/8/8/8/8/8",
    decided,
    stem: frame?.stem ?? "",
    accept: {},
    prefilled: prefilled[key] ?? {},
  });
  const pen = useAlphaPen(key);

  const ahead = frame ? aheadCorrections(frame) : [];
  const said = (verdict: string) => answered[`${key}|${verdict}`] !== undefined;
  const position = said("position-ok") || frame?.review.position === "ok";
  const flagged = said("interval") || frame?.intervalFlagged;
  /** Gemalte Pixel schlagen den Serverstand: die Zahlen sind ab dem Speichern wieder SAM's. */
  const alphaFrom = painted[key] ? "pending" : (frame?.alpha ?? "sam");

  const step = useCallback((delta: number) => {
    const next = Math.max(0, Math.min(frames.length - 1, index + delta));
    setAt({ key: frames[next] ? verifyFrameKey(frames[next]) : "", index: next });
  }, [frames, index]);

  const write = useCallback(
    async (rows: ReviewNote[], mark: string[]) => {
      try {
        await post("/api/review-notes", { rows });
        setAnswered((a) => ({ ...a, ...Object.fromEntries(mark.map((m) => [`${key}|${m}`, m])) }));
      } catch (e) {
        setError(String(e));
      }
    },
    [key],
  );

  /** ⏎ ist der ganze übliche Frame: erst was der Pinsel korrigiert hat, dann das Urteil. */
  const confirmFrame = useCallback(async (ahead = false) => {
    if (!frame || !session) return;
    if (ahead && !frame.next) {
      setError("Kein nächster Zug — das ist die letzte Stellung der Partie.");
      return;
    }
    try {
      const corrections = ahead ? [...aheadCorrections(frame), ...paint.plan.corrections] : paint.plan.corrections;
      const rows: Correction[] = corrections.map((r) => ({
        session_id: session.sessionId,
        frame: frame.stem,
        square: r.square,
        label: r.label,
      }));
      if (rows.length > 0) await post("/api/corrections", { rows, ledger: "corrections" });
      paint.markCommitted(paint.plan.committed);
      await write([{ session_id: session.sessionId, frame: frame.stem, verdict: "position-ok" }],
                  ["position-ok"]);

      const carried = carryPositionCorrections({
        frames,
        from: index,
        corrections,
        decided: stream.decided,
        current: prefilled,
      });
      setPrefilled(carried.prefilled);
      setCarryNotice(
        carried.count > 0
          ? { session: frame.session, ply: frame.ply, count: carried.count }
          : null,
      );

      step(1);
    } catch (e) {
      setError(String(e));
    }
  }, [
    frame,
    frames,
    index,
    paint,
    prefilled,
    session,
    step,
    stream.decided,
    write,
  ]);

  /** „Den FEN kann ich hier nicht garantieren" — das ganze Intervall, nicht Zelle für Zelle. */
  const flagInterval = useCallback(() => {
    if (!frame || !session) return;
    void write([{ session_id: session.sessionId, ply: frame.ply, verdict: "bad-interval" }], ["interval"]);
  }, [frame, session, write]);

  /** Pixel, sonst nichts: die Zahlen bleiben SAM's, bis `occluders recut` gelaufen ist. */
  const saveAlpha = useCallback(async () => {
    const mask = pen.maskPng();
    if (!frame || !session || !mask) return;
    try {
      await post(`/api/matte/${session.name}/${frame.stem}`, { mask });
      setPainted((p) => ({ ...p, [key]: Date.now() }));
      setNotice("Alpha gespeichert — die Zahlen sind noch SAM's, bis `occluders recut` gelaufen ist");
      pen.reset();
    } catch (e) {
      setError(String(e));
    }
  }, [frame, key, pen, session]);

  const recut = useCallback(async () => {
    if (!session) return;
    setNotice("recut läuft …");
    try {
      const answer = await post<{ done: string }>(`/api/matte/${session.name}`, { recut: true });
      setNotice(answer.done);
      router.refresh();
    } catch (e) {
      setNotice(null);
      setError(String(e));
    }
  }, [router, session]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const hit: Record<string, () => void> = {
        u: () => flagInterval(),
        m: () => setAlpha((v) => !v),
        p: () => pen.setArmed(!pen.armed),
        Enter: () => void confirmFrame(event.shiftKey),
        ArrowLeft: () => step(-1),
        ArrowRight: () => step(1),
      };
      const drawing: Record<string, () => void> = {
        e: () => pen.setErase(!pen.erase),
        "[": () => pen.resize(-1),
        "]": () => pen.resize(1),
        z: () => pen.undo(),
        s: () => void saveAlpha(),
      };
      const run = hit[event.key] ?? (pen.armed ? drawing[event.key] : undefined);
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmFrame, flagInterval, pen, saveAlpha, step]);

  if (!frame || !session) {
    return (
      <p className="text-muted-foreground text-sm">
        Keine Matte offen — entweder ist alles geprüft, oder auf der Platte liegt noch keine{" "}
        <code>matte.jsonl</code>. Das heißt „noch nicht gemessen“, nicht „nichts gefunden“.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <span className="text-foreground text-sm font-medium tabular-nums">
          noch {stream.progress.open - index}{" "}
          <span className="text-muted-foreground text-xs font-normal">Frames</span>
        </span>
        {/* Die Liste endet bei VERIFY_PAGE, der Zaehler nicht — ohne den Hinweis sieht das Ende
            der Seite wie ein Fehler aus, waehrend noch Hunderte offen sind. */}
        {frames.length < stream.progress.open ? (
          <span className="text-muted-foreground text-xs">{frames.length} geladen</span>
        ) : null}
        <span className="text-muted-foreground truncate font-mono">
          {session.sessionId} · {frame.stem} · ply {frame.ply}
          {frame.reason ? ` · ${frame.reason}` : ""}
        </span>
        {/* Der Hand im Alpha gehoert ein Zug: `last` hat das Brett gemacht, `next` wird gerade
            hineingespielt — genau die Entscheidung, die die beiden ⏎-Knoepfe abfragen. */}
        <span className="font-mono">
          <span className="text-foreground">
            {frame.last ? moveLabel(frame.last.ply, frame.last.san) : "Startstellung"}
          </span>
          <span className="text-muted-foreground">
            {" → "}
            {frame.next ? moveLabel(frame.next.ply, frame.next.san) : "Partieende"}
          </span>
        </span>
        {carryNotice &&
carryNotice.session === frame.session &&
carryNotice.ply === frame.ply ? (
  <span className="text-cyan-300">
    {carryNotice.count} {carryNotice.count === 1 ? "Frame" : "Frames"} dieses Ply vorgefüllt
  </span>
) : null}<Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-amber-300 tabular-nums">
              {frame.covered.length} Felder &gt; {PIECE_VISIBLE_MAX}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {frame.covered.join(" ") || "kein Feld über der Schwelle"}
          </TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground font-mono">
          {Object.entries(frame.concepts).map(([c, p]) => `${c} ${p}`).join(" · ") || "keine Konzepte"}
        </span>
        {position ? <span className="text-green-400">Stellung bestätigt</span> : null}
        {flagged ? <span className="text-amber-400">FEN unsicher</span> : null}
      </div>

      {alphaFrom === "sam" ? null : (
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-xs ${
            alphaFrom === "pending" ? "border-amber-500/60 bg-amber-500/10 text-amber-200" : "border-green-600/50 text-green-300"
          }`}
        >
          {alphaFrom === "pending" ? (
            <>
              <span>
                Alpha von Hand korrigiert — <strong>die Zahlen auf dem Brett sind noch SAM&apos;s.</strong> Erst{" "}
                <code>chesslab occluders recut {session.name}</code> schneidet die Coverage neu.
              </span>
              <Button className={`${TOUCH} ml-auto`} onClick={() => void recut()} size="sm" variant="secondary">
                recut jetzt
              </Button>
            </>
          ) : (
            <span>Alpha von Hand korrigiert · Coverage daraus neu geschnitten</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button className={TOUCH} onClick={() => void confirmFrame(false)} size="sm">
          ⏎ {frame.last ? moveLabel(frame.last.ply, frame.last.san) : "Startstellung"}
          {paint.plan.corrections.length > 0 ? ` · ${paint.plan.corrections.length} korrigiert` : ""}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={TOUCH}
              disabled={!frame.next}
              onClick={() => void confirmFrame(true)}
              size="sm"
              variant="secondary"
            >
              ⇧⏎ {frame.next ? moveLabel(frame.next.ply, frame.next.san) : "Partieende"}
              {ahead.length > 0 ? ` · ${ahead.length} Felder` : ""}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Das Brett steht schon NACH dem Zug, das Intervall hängt noch davor. Schreibt{" "}
            {ahead.map((c) => `${c.square} ${c.label}`).join(", ") || "nichts"} als Korrektur — die
            schlägt das Intervall-Label und rettet den Frame, statt ihn zu verwerfen.
          </TooltipContent>
        </Tooltip>
        <Button className={TOUCH} onClick={() => flagInterval()} size="sm" variant="outline">
          <span className="text-muted-foreground mr-1 font-mono">u</span> FEN unsicher
        </Button>
        <span className="ml-auto flex items-center gap-2">
          <Button
            className={TOUCH}
            onClick={(event) => {
              event.currentTarget.blur();
              setAlpha((v) => !v);
            }}
            size="sm"
            variant={alpha ? "default" : "outline"}
          >
            <span className="mr-1 font-mono">m</span> Alpha
          </Button>
          <Button className={TOUCH} onClick={() => step(-1)} size="sm" variant="outline">
            ←
          </Button>
          <Button className={TOUCH} onClick={() => step(1)} size="sm" variant="outline">
            →
          </Button>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <AlphaPenControls onSave={() => void saveAlpha()} pen={pen} />
        <PaletteRow active={paint.eraser ? undefined : paint.brush} disabled={pen.armed} onPick={paint.setBrush} />
        <span className="text-muted-foreground ml-auto text-xs">
          {pen.armed
            ? "Pinsel malt ALPHA, nicht Labels — rot hebt, cyan senkt; gespeichert wird nur ein Bild"
            : `Pinsel ${paint.brush} — nur die 13 Identitäten; verdeckt ist gemessen, nicht gemalt`}
        </span>
      </div>

      <BoardSurface
        accept={{}}
        alt={`board ${frame.stem}`}
        coverage={frame.coverage}
        hideEmpty
        overlay={
          alpha ? (
            <Image
              alt={`alpha ${frame.stem}`}
              className="pointer-events-none object-contain opacity-70 mix-blend-screen"
              fill
              sizes="720px"
              src={`/api/matte/${session.name}/${frame.stem}?size=720&v=${painted[key] ?? 0}`}
              unoptimized
            />
          ) : null
        }
        src={`/api/board/${session.name}/${frame.stem}?size=720`}
        state={paint}
        tool={<AlphaPenLayer pen={pen} />}
      />

      {notice ? <Notice tone="warn">{notice}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
        <BoardLegend showPrefilled />
        <span className="ml-auto flex flex-wrap gap-x-3">
          {KEYS.map(([k, what]) => (
            <span key={k}>
              <kbd className="text-foreground font-mono">{k}</kbd> {what}
            </span>
          ))}
        </span>
      </div>
    </section>
  );
}
