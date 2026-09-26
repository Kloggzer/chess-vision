"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Notice } from "@/components/notice";
import { Button, TOUCH } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { commitPage, type MatteVerdict, type PageCommit, revertPage } from "@/lib/label/matte-page";
import { pageAllMarked, toggleAllOnPage } from "@/lib/label/matte-select";
import { clampPage } from "@/lib/label/page-turn";
import { verifyFrameKey } from "@/lib/label/position-carry";
import type { ReviewNote } from "@/lib/session-store/review-notes";
import type { VerifyStream } from "@/lib/label/verify";
import { MatteFrame } from "./frame";
import { MATTE_PAGE, MatteGrid } from "./grid";
import { fetchJson, postJson as post } from "@/lib/answer";
import { inField } from "@/lib/keys";

/** Ab hier wird nachgeladen: drei Seiten Vorrat reichen, damit niemand auf den Nachschub wartet. */
const REFILL_AT = MATTE_PAGE * 3;

/**
 * Der Nachschub kommt als eigener Schnitt vom Server, also mit EIGENEN Session-Indizes. Die
 * bestehenden bleiben stehen — sonst zeigen `answered` und `marked` auf fremde Frames.
 */
function mergeStream(prev: VerifyStream, next: VerifyStream): VerifyStream {
  const sessions = [...prev.sessions];
  const index = new Map(sessions.map((s, i) => [s.name, i]));
  const at = next.sessions.map((s) => {
    const hit = index.get(s.name);
    if (hit !== undefined) return hit;
    index.set(s.name, sessions.length);
    return sessions.push(s) - 1;
  });
  const have = new Set(prev.frames.map((f) => `${prev.sessions[f.session].name}|${f.stem}`));
  const frames = [...prev.frames];
  for (const frame of next.frames) {
    if (have.has(`${next.sessions[frame.session].name}|${frame.stem}`)) continue;
    frames.push({ ...frame, session: at[frame.session] });
  }
  return { sessions, frames, progress: next.progress };
}

const KEYS: [string, string][] = [
  ["1…0", "Bild markieren — markiert heißt „taugt nichts“"],
  ["⏎", "Seite schreiben → nächste zehn"],
  ["a", "alle markieren / keins"],
  ["∅ / Rechtsklick", "als „keine Überlagerung“ vormerken — geschrieben wird mit ⏎"],
  ["m", "Alpha ein/aus"],
  ["← →", "Seite blättern"],
  ["u", "letzte geschriebene Seite zurücknehmen"],
];

/** Eine Frage pro Frame: schneidet die Maske die Hand richtig aus. Zehn auf einmal, weil SAMs Schnitt
 *  meistens stimmt — markiert wird die Ausnahme. Die STELLUNG ist eine Zellfrage der Strittig-Lane. */
export function MatteReview({ stream }: { stream: VerifyStream }) {
  const [loaded, setLoaded] = useState(stream);
  const [more, setMore] = useState(true);
  const loading = useRef(false);
  const [page, setPage] = useState(0);
  const [alpha, setAlpha] = useState(true);
  const [answered, setAnswered] = useState<Record<string, MatteVerdict>>({});
  const [marked, setMarked] = useState<ReadonlySet<string>>(new Set<string>());
  const [clean, setClean] = useState<ReadonlySet<string>>(new Set<string>());
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Die geschriebenen Seiten, juengste zuletzt — ohne sie war ein Fehlgriff endgueltig. */
  const [trail, setTrail] = useState<PageCommit[]>([]);

  /**
   * Beurteiltes faellt raus, der Seitenindex bleibt — so schieben sich die naechsten zehn nach,
   * statt dass der Blick auf eine neue Seite springt. Der Serverstand bleibt die Grundlage: die
   * Liste darf sich nicht unter der Hand sortieren, waehrend jemand markiert.
   */
  const open = useMemo(
    () => loaded.frames.filter((f) => answered[verifyFrameKey(f)] === undefined),
    [answered, loaded.frames],
  );

  /** Laeuft der Vorrat leer, holt der Client den naechsten Schnitt. `skip` nennt nur, was der Server
   *  noch als offen fuehrt — Beurteiltes ist dort schon raus. */
  useEffect(() => {
    if (!more || loading.current || open.length >= REFILL_AT) return;
    loading.current = true;
    void (async () => {
      try {
        const next = await fetchJson<VerifyStream>(`/api/verify?skip=${open.length}`);
        setLoaded((was) => {
          const merged = mergeStream(was, next);
          if (merged.frames.length === was.frames.length) setMore(false);
          return merged;
        });
      } catch (e) {
        setError(String(e));
        setMore(false);
      } finally {
        loading.current = false;
      }
    })();
  }, [more, open.length]);
  const pages = Math.max(1, Math.ceil(open.length / MATTE_PAGE));
  const at = Math.min(page, pages - 1);
  const slice = useMemo(() => open.slice(at * MATTE_PAGE, at * MATTE_PAGE + MATTE_PAGE), [at, open]);

const flip = (key: string) => (was: ReadonlySet<string>) => {
  const next = new Set(was);
  if (!next.delete(key)) next.add(key);
  return next;
};

const drop = (key: string) => (was: ReadonlySet<string>) =>
  was.has(key) ? new Set([...was].filter((k) => k !== key)) : was;

  const toggle = useCallback((key: string) => {
    setMarked(flip(key));
    setClean(drop(key));
  }, []);

  /** Vormerken, nicht schreiben: das leere Alpha entsteht erst mit dem Commit der Seite. */
  const markClean = useCallback((key: string) => {
    setClean(flip(key));
    setMarked(drop(key));
  }, []);

  /**
   * Ein Schreibvorgang pro Seite: `matte-clean` fuer die vorgemerkten, `matte-bad` fuer die
   * markierten, `matte-ok` fuer den Rest. Die leeren Alphas liegen VOR dem Ledger — ein Urteil
   * ohne seine Pixel waere eine Zeile ueber eine Maske, die noch SAMs ist.
   */
  const commit = useCallback(async () => {
    if (slice.length === 0) return;
    const plan = commitPage(slice.map(verifyFrameKey), marked, clean);
    const rows: ReviewNote[] = slice.map((frame) => ({
      session_id: loaded.sessions[frame.session].sessionId,
      frame: frame.stem,
      verdict: plan.verdicts[verifyFrameKey(frame)],
    }));
    try {
      for (const frame of slice.filter((f) => clean.has(verifyFrameKey(f)))) {
        await post(`/api/matte/${loaded.sessions[frame.session].name}/${frame.stem}`, { clear: true });
      }
      await post("/api/review-notes", { rows });
      setAnswered((a) => ({ ...a, ...plan.verdicts }));
      setMarked(plan.marked);
      setClean(plan.clean);
      setTrail((t) => [...t, plan]);
    } catch (e) {
      setError(String(e));
    }
  }, [clean, loaded.sessions, marked, slice]);

  /**
   * Die zuletzt geschriebene Seite zurueck. Erst die Alphas, dann die Zeilen: andersherum waere
   * der Frame schon wieder offen, waehrend seine Pixel noch die geleerten sind.
   */
  const undo = useCallback(async () => {
    const plan = trail[trail.length - 1];
    if (!plan) return;
    const back = revertPage(plan);
    try {
      for (const key of back.restore) {
        const frame = loaded.frames.find((f) => verifyFrameKey(f) === key);
        if (!frame) continue;
        await post(`/api/matte/${loaded.sessions[frame.session].name}/${frame.stem}`, { restore: true });
      }
      await post("/api/review-notes", {
        rows: back.verdicts.flatMap(({ key, verdict }) => {
          const frame = loaded.frames.find((f) => verifyFrameKey(f) === key);
          return frame
            ? [{ session_id: loaded.sessions[frame.session].sessionId, frame: frame.stem, verdict }]
            : [];
        }),
        retract: true,
      });
      setAnswered((a) => {
        const rest = { ...a };
        for (const { key } of back.verdicts) delete rest[key];
        return rest;
      });
      setMarked((was) => new Set([...was, ...back.marked]));
      setClean((was) => new Set([...was, ...back.clean]));
      setTrail((t) => t.slice(0, -1));
    } catch (e) {
      setError(String(e));
    }
  }, [loaded.frames, loaded.sessions, trail]);

  /** Ein Urteil aus der Einzelansicht — dasselbe Ledger, nur eine Zeile statt zehn. */
  const judgeOne = useCallback(
    async (frameKey: string, verdict: MatteVerdict) => {
      const frame = open.find((f) => verifyFrameKey(f) === frameKey);
      if (!frame) return;
      await post("/api/review-notes", {
        rows: [{ session_id: loaded.sessions[frame.session].sessionId, frame: frame.stem, verdict }],
      });
      setAnswered((a) => ({ ...a, [frameKey]: verdict }));
      setDetail(null);
    },
    [loaded.sessions, open],
  );

  /**
   * "Da ist keine Hand": erst das leere Alpha schreiben, dann das Urteil — andersherum faellt der
   * Frame aus der Liste, bevor die Pixel liegen. Die Coverage zieht `occluders recut` nach.
   */
  const clearOne = useCallback(
    async (frameKey: string) => {
      const frame = open.find((f) => verifyFrameKey(f) === frameKey);
      if (!frame) return;
      try {
        await post(`/api/matte/${loaded.sessions[frame.session].name}/${frame.stem}`, { clear: true });
        await judgeOne(frameKey, "matte-clean");
      } catch (e) {
        setError(String(e));
      }
    },
    [judgeOne, loaded.sessions, open],
  );

  // Seitenweise, nicht ersetzend: `setMarked(allMarked())` verlor die Marken jeder anderen Seite.
  const pageKeys = useMemo(() => slice.map(verifyFrameKey), [slice]);
  const allOn = pageAllMarked(pageKeys, marked, clean);
  const toggleAll = useCallback(
    () => setMarked((was) => toggleAllOnPage(pageKeys, was, clean)),
    [clean, pageKeys],
  );

  useEffect(() => {
    if (detail !== null) return;
    function onKey(event: KeyboardEvent) {
      if (inField(event)) return;
      const digit = /^[0-9]$/.test(event.key) ? (Number(event.key) + 9) % 10 : -1;
      const hit: Record<string, () => void> = {
        Enter: () => void commit(),
        m: () => setAlpha((v) => !v),
        a: () => toggleAll(),
        u: () => void undo(),
        ArrowLeft: () => setPage((p) => clampPage(p, -1, pages)),
        ArrowRight: () => setPage((p) => clampPage(p, 1, pages)),
      };
      const run = hit[event.key] ?? (slice[digit] ? () => toggle(verifyFrameKey(slice[digit])) : undefined);
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, detail, pages, slice, toggleAll, toggle, undo]);

  const frame = detail === null ? undefined : open.find((f) => verifyFrameKey(f) === detail);
  if (frame) {
    return (
      <MatteFrame
        frame={frame}
        onClean={() => clearOne(detail!)}
        onClose={() => setDetail(null)}
        onJudge={(verdict) => judgeOne(detail!, verdict)}
        session={loaded.sessions[frame.session]}
      />
    );
  }

  if (open.length === 0 && more) {
    return <p className="text-muted-foreground text-sm">Lädt die nächsten Frames …</p>;
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
      <header className="border-border bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <span className="text-foreground text-sm font-medium tabular-nums">
          Seite {at + 1}/{pages}{" "}
          <span className="text-muted-foreground text-xs font-normal">· noch {loaded.progress.open} Frames</span>
        </span>
        {more ? <span className="text-muted-foreground">{loaded.frames.length} geladen</span> : null}
        <span className="text-amber-400 tabular-nums">{marked.size} markiert</span>
        {clean.size > 0 ? <span className="text-cyan-300 tabular-nums">{clean.size} leer</span> : null}
        <span className="text-muted-foreground ml-auto">
          Markiert heißt „die Maske taugt nichts“ — der Rest wird mit ⏎ bestätigt
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button className={TOUCH} onClick={() => void commit()} size="sm">
              ⏎ {slice.length - marked.size - clean.size} gut, {marked.size} raus, {clean.size} leer
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Schreibt die ganze Seite: `matte-ok` für die unmarkierten, `matte-bad` für die
            markierten, `matte-clean` plus leeres Alpha für die vorgemerkten. Wer eine Maske von
            Hand nachziehen will, öffnet sie mit „Pinsel“.
          </TooltipContent>
        </Tooltip>
        <Button
          className={TOUCH}
          onClick={toggleAll}
          size="sm"
          variant="outline"
        >
          <span className="text-muted-foreground mr-1 font-mono">a</span>
          {allOn ? "keins" : "alle"}
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
          <Button
            className={TOUCH}
            disabled={trail.length === 0}
            onClick={() => void undo()}
            size="sm"
            variant="outline"
          >
            <span className="mr-1 font-mono">u</span> ⟲ zurück
          </Button>
          <Button className={TOUCH} onClick={() => setPage((p) => clampPage(p, -1, pages))} size="sm" variant="outline">
            ←
          </Button>
          <Button className={TOUCH} onClick={() => setPage((p) => clampPage(p, 1, pages))} size="sm" variant="outline">
            →
          </Button>
        </span>
      </div>

      <MatteGrid
        alpha={alpha}
        frames={slice}
        clean={clean}
        marked={marked}
        onClean={markClean}
        onOpen={setDetail}
        onToggle={toggle}
        sessions={loaded.sessions}
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
