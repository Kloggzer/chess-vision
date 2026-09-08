"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { verifyFrameKey } from "@/lib/position-carry";
import type { ReviewNote } from "@/lib/review-notes";
import type { VerifyStream } from "@/lib/verify";
import { MatteFrame } from "./frame";
import { MATTE_PAGE, MatteGrid } from "./grid";

const TOUCH = "max-sm:h-11 max-sm:px-3";

export type MatteVerdict = "matte-ok" | "matte-bad";

const KEYS: [string, string][] = [
  ["1…0", "Bild markieren — markiert heißt „taugt nichts“"],
  ["⏎", "Seite schreiben → nächste zehn"],
  ["a", "alle markieren / keins"],
  ["m", "Alpha ein/aus"],
  ["← →", "Seite blättern"],
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
 * Eine Frage pro Frame: schneidet die Maske die Hand richtig aus. Zehn auf einmal, weil SAMs
 * Schnitt meistens stimmt — markiert wird die Ausnahme (User, 2026-09-07). Ob die STELLUNG stimmt,
 * wird hier nicht mehr gefragt: das ist eine Zellfrage und liegt in der Strittig-Lane.
 */
export function MatteReview({ stream }: { stream: VerifyStream }) {
  const [page, setPage] = useState(0);
  const [alpha, setAlpha] = useState(true);
  const [answered, setAnswered] = useState<Record<string, MatteVerdict>>({});
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set<string>());
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Beurteiltes faellt raus, der Seitenindex bleibt — so schieben sich die naechsten zehn nach,
   * statt dass der Blick auf eine neue Seite springt. Der Serverstand bleibt die Grundlage: die
   * Liste darf sich nicht unter der Hand sortieren, waehrend jemand markiert.
   */
  const open = useMemo(
    () => stream.frames.filter((f) => answered[verifyFrameKey(f)] === undefined),
    [answered, stream.frames],
  );
  const pages = Math.max(1, Math.ceil(open.length / MATTE_PAGE));
  const at = Math.min(page, pages - 1);
  const slice = useMemo(() => open.slice(at * MATTE_PAGE, at * MATTE_PAGE + MATTE_PAGE), [at, open]);

  const toggle = useCallback((key: string) => {
    setMarked((was) => {
      const next = new Set(was);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  /** Ein Schreibvorgang pro Seite: `matte-ok` fuer alles Unmarkierte, `matte-bad` fuer den Rest. */
  const commit = useCallback(async () => {
    if (slice.length === 0) return;
    const rows: ReviewNote[] = [];
    const done: Record<string, MatteVerdict> = {};
    for (const frame of slice) {
      const key = verifyFrameKey(frame);
      const verdict: MatteVerdict = marked.has(key) ? "matte-bad" : "matte-ok";
      rows.push({ session_id: stream.sessions[frame.session].sessionId, frame: frame.stem, verdict });
      done[key] = verdict;
    }
    try {
      await post("/api/review-notes", { rows });
      setAnswered((a) => ({ ...a, ...done }));
      setMarked(new Set<string>());
    } catch (e) {
      setError(String(e));
    }
  }, [marked, slice, stream.sessions]);

  /** Ein Urteil aus der Einzelansicht — dasselbe Ledger, nur eine Zeile statt zehn. */
  const judgeOne = useCallback(
    async (frameKey: string, verdict: MatteVerdict) => {
      const frame = open.find((f) => verifyFrameKey(f) === frameKey);
      if (!frame) return;
      await post("/api/review-notes", {
        rows: [{ session_id: stream.sessions[frame.session].sessionId, frame: frame.stem, verdict }],
      });
      setAnswered((a) => ({ ...a, [frameKey]: verdict }));
      setDetail(null);
    },
    [open, stream.sessions],
  );

  useEffect(() => {
    if (detail !== null) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const digit = /^[0-9]$/.test(event.key) ? (Number(event.key) + 9) % 10 : -1;
      const hit: Record<string, () => void> = {
        Enter: () => void commit(),
        m: () => setAlpha((v) => !v),
        a: () =>
          setMarked((was) =>
            was.size === slice.length ? new Set<string>() : new Set(slice.map(verifyFrameKey)),
          ),
        ArrowLeft: () => setPage((p) => Math.max(0, p - 1)),
        ArrowRight: () => setPage((p) => p + 1),
      };
      const run = hit[event.key] ?? (slice[digit] ? () => toggle(verifyFrameKey(slice[digit])) : undefined);
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, detail, slice, toggle]);

  const frame = detail === null ? undefined : open.find((f) => verifyFrameKey(f) === detail);
  if (frame) {
    return (
      <MatteFrame
        frame={frame}
        onClose={() => setDetail(null)}
        onJudge={(verdict) => judgeOne(detail!, verdict)}
        session={stream.sessions[frame.session]}
      />
    );
  }

  if (open.length === 0) {
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
          Seite {at + 1}/{pages}{" "}
          <span className="text-muted-foreground text-xs font-normal">· noch {stream.progress.open} Frames</span>
        </span>
        {/* Die Liste endet bei VERIFY_PAGE, der Zaehler nicht — ohne den Hinweis sieht das Ende
            der Seite wie ein Fehler aus, waehrend noch Hunderte offen sind. */}
        {stream.frames.length < stream.progress.open ? (
          <span className="text-muted-foreground">{stream.frames.length} geladen</span>
        ) : null}
        <span className="text-amber-400 tabular-nums">{marked.size} markiert</span>
        <span className="text-muted-foreground ml-auto">
          Markiert heißt „die Maske taugt nichts“ — der Rest wird mit ⏎ bestätigt
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className={TOUCH} onClick={() => void commit()} size="sm">
              ⏎ {slice.length - marked.size} gut, {marked.size} raus
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Schreibt die ganze Seite: `matte-ok` für die unmarkierten, `matte-bad` für die
            markierten. Wer eine Maske von Hand nachziehen will, öffnet sie mit „Pinsel“.
          </TooltipContent>
        </Tooltip>
        <Button
          className={TOUCH}
          onClick={() =>
            setMarked((was) =>
              was.size === slice.length ? new Set<string>() : new Set(slice.map(verifyFrameKey)),
            )
          }
          size="sm"
          variant="outline"
        >
          <span className="text-muted-foreground mr-1 font-mono">a</span>
          {marked.size === slice.length ? "keins" : "alle"}
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
          <Button className={TOUCH} onClick={() => setPage((p) => Math.max(0, p - 1))} size="sm" variant="outline">
            ←
          </Button>
          <Button className={TOUCH} onClick={() => setPage((p) => p + 1)} size="sm" variant="outline">
            →
          </Button>
        </span>
      </div>

      <MatteGrid
        alpha={alpha}
        frames={slice}
        marked={marked}
        onOpen={setDetail}
        onToggle={toggle}
        sessions={stream.sessions}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="text-muted-foreground flex flex-wrap items-center justify-end gap-x-3 text-xs">
        {KEYS.map(([k, what]) => (
          <span key={k}>
            <kbd className="text-foreground font-mono">{k}</kbd> {what}
          </span>
        ))}
      </div>
    </section>
  );
}
