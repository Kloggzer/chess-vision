"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { BoardLegend, BoardSurface, useBoardPaint } from "@/components/board-paint";
import { PaletteRow } from "@/components/palette-row";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PIECE_VISIBLE_MAX } from "@/lib/classes";
import type { Correction } from "@/lib/corrections";
import type { FrameVerdict } from "@/lib/review-notes";
import type { VerifyStream } from "@/lib/verify";

const TOUCH = "max-sm:h-11 max-sm:px-3";

const KEYS: [string, string][] = [
  ["j", "Alpha stimmt"],
  ["n", "Alpha falsch"],
  ["⏎", "Stellung stimmt → nächster"],
  ["u", "FEN unsicher (ganzes Intervall)"],
  ["m", "Alpha ein/aus"],
  ["← →", "Frame blättern"],
];

async function post(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const answer = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(answer.error ?? res.statusText);
}

/**
 * Ein Frame, zwei Fragen (CONCEPT.md 4.2 in neuer Fassung): stimmt SAM 3s Alpha, und stimmt die
 * Stellung des Intervalls. Verdeckte Felder werden NICHT gelabelt — ihre `coverage` liegt über
 * 0.15 und nimmt sie von selbst aus dem Klassen-Loss (`training/occlusion.py`).
 */
export function MatteReview({ stream }: { stream: VerifyStream }) {
  const [at, setAt] = useState(0);
  const [alpha, setAlpha] = useState(true);
  const [answered, setAnswered] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const frames = stream.frames;
  const frame = frames[Math.min(at, frames.length - 1)];
  const session = frame ? stream.sessions[frame.session] : undefined;
  const key = frame ? `${frame.session}|${frame.stem}` : "";
  const decided = frame ? (stream.decided[frame.session] ?? {}) : {};

  const paint = useBoardPaint({
    boardKey: key,
    fen: frame?.fen ?? "8/8/8/8/8/8/8/8",
    decided,
    stem: frame?.stem ?? "",
    accept: {},
  });

  const step = useCallback((delta: number) => {
    setAt((i) => Math.max(0, Math.min(frames.length - 1, i + delta)));
  }, [frames.length]);

  const note = useCallback(
    async (verdict: FrameVerdict) => {
      if (!frame || !session) return;
      try {
        await post("/api/review-notes", {
          rows: [{ session_id: session.sessionId, frame: frame.stem, verdict }],
        });
        setAnswered((a) => ({ ...a, [`${key}|${verdict}`]: verdict }));
      } catch (e) {
        setError(String(e));
      }
    },
    [frame, key, session],
  );

  /** Was der Pinsel korrigiert hat, dann das Urteil — die Korrektur IST die Antwort auf Frage 2. */
  const confirmPosition = useCallback(async () => {
    if (!frame || !session) return;
    try {
      const rows: Correction[] = paint.plan.corrections.map((r) => ({
        session_id: session.sessionId,
        frame: frame.stem,
        square: r.square,
        label: r.label,
      }));
      if (rows.length > 0) await post("/api/corrections", { rows, ledger: "corrections" });
      paint.markCommitted(paint.plan.committed);
      await note("position-ok");
      step(1);
    } catch (e) {
      setError(String(e));
    }
  }, [frame, note, paint, session, step]);

  /** „Den FEN kann ich hier nicht garantieren" — das ganze Intervall, nicht Zelle für Zelle. */
  const flagInterval = useCallback(async () => {
    if (!frame || !session) return;
    try {
      await post("/api/review-notes", {
        rows: [{ session_id: session.sessionId, ply: frame.ply, verdict: "bad-interval" }],
      });
      setAnswered((a) => ({ ...a, [`${key}|interval`]: "bad-interval" }));
    } catch (e) {
      setError(String(e));
    }
  }, [frame, key, session]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const hit: Record<string, () => void> = {
        j: () => void note("matte-ok"),
        n: () => void note("matte-bad"),
        u: () => void flagInterval(),
        m: () => setAlpha((v) => !v),
        Enter: () => void confirmPosition(),
        ArrowLeft: () => step(-1),
        ArrowRight: () => step(1),
      };
      const run = hit[event.key];
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmPosition, flagInterval, note, step]);

  if (!frame || !session) {
    return (
      <p className="text-muted-foreground text-sm">
        Keine Matte offen — entweder ist alles geprüft, oder auf der Platte liegt noch keine{" "}
        <code>matte.jsonl</code>. Das heißt „noch nicht gemessen“, nicht „nichts gefunden“.
      </p>
    );
  }

  const said = (verdict: string) => answered[`${key}|${verdict}`] !== undefined;
  const matte = said("matte-ok") ? "ok" : said("matte-bad") ? "bad" : frame.review.matte;
  const position = said("position-ok") || frame.review.position === "ok";
  const flagged = said("interval") || frame.intervalFlagged;

  return (
    <section className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <span className="text-foreground text-sm font-medium tabular-nums">
          {at + 1}/{frames.length} <span className="text-muted-foreground text-xs font-normal">Frames</span>
        </span>
        <span className="text-muted-foreground truncate font-mono">
          {session.sessionId} · {frame.stem} · ply {frame.ply}
          {frame.reason ? ` · ${frame.reason}` : ""}
        </span>
        <Tooltip>
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
        {matte ? (
          <span className={matte === "ok" ? "text-green-400" : "text-destructive"}>
            Alpha {matte === "ok" ? "bestätigt" : "verworfen"}
          </span>
        ) : null}
        {position ? <span className="text-green-400">Stellung bestätigt</span> : null}
        {flagged ? <span className="text-amber-400">FEN unsicher</span> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button className={TOUCH} onClick={() => void note("matte-ok")} size="sm" variant="secondary">
          <span className="text-muted-foreground mr-1 font-mono">j</span> Alpha stimmt
        </Button>
        <Button className={TOUCH} onClick={() => void note("matte-bad")} size="sm" variant="destructive">
          <span className="mr-1 font-mono">n</span> Alpha falsch
        </Button>
        <Button className={TOUCH} onClick={() => void confirmPosition()} size="sm">
          ⏎ Stellung stimmt
          {paint.plan.corrections.length > 0 ? ` · ${paint.plan.corrections.length} korrigiert` : ""}
        </Button>
        <Button className={TOUCH} onClick={() => void flagInterval()} size="sm" variant="outline">
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
        <PaletteRow active={paint.eraser ? undefined : paint.brush} onPick={paint.setBrush} />
        <span className="text-muted-foreground ml-auto text-xs">
          Pinsel <span className="text-foreground font-mono">{paint.brush}</span> — nur die 13
          Identitäten; verdeckt ist gemessen, nicht gemalt
        </span>
      </div>

      <BoardSurface
        accept={{}}
        alt={`board ${frame.stem}`}
        coverage={frame.coverage}
        overlay={
          alpha ? (
            <Image
              alt={`alpha ${frame.stem}`}
              className="pointer-events-none object-contain opacity-70 mix-blend-screen"
              fill
              sizes="720px"
              src={`/api/matte/${session.name}/${frame.stem}?size=720`}
              unoptimized
            />
          ) : null
        }
        src={`/api/board/${session.name}/${frame.stem}?size=720`}
        state={paint}
      />

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
        <BoardLegend />
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
