"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlphaPenControls, AlphaPenLayer, useAlphaPen } from "@/components/alpha-pen";
import { BoardSurface } from "@/components/board-paint";
import { Notice } from "@/components/notice";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PIECE_VISIBLE_MAX } from "@/lib/classes";
import { moveLabel } from "@/lib/fen";
import { verifyFrameKey } from "@/lib/label/position-carry";
import type { MatteVerdict } from "@/lib/label/matte-page";
import type { VerifyFrame, VerifySession } from "@/lib/label/verify";
import { postJson as post } from "@/lib/answer";
import { inField } from "@/lib/keys";

const TOUCH = "max-sm:h-11 max-sm:px-3";

const KEYS: [string, string][] = [
  ["⏎", "Alpha stimmt (speichert offene Striche) → zurück ins Raster"],
  ["x", "Matte taugt nichts → zurück ins Raster"],
  ["c", "keine Überlagerung → Alpha leeren, Frame clean"],
  ["⎋", "zurück ins Raster, ohne Urteil"],
  ["m", "Alpha ein/aus"],
  ["e", "malen/radieren · [ ] Größe · z zurück · s speichern"],
];

export type MatteFrameProps = {
  frame: VerifyFrame;
  session: VerifySession;
  onJudge: (verdict: MatteVerdict) => Promise<void>;
  onClean: () => Promise<void>;
  onClose: () => void;
};

/**
 * EIN Frame, gross, mit dem Pinsel — die Ausnahme fuer die Maske, die das Raster nicht mit einem
 * Klick abtut. Der Stift ist hier immer scharf: wer diese Ansicht oeffnet, kommt zum Malen.
 */
export function MatteFrame({ frame, session, onJudge, onClean, onClose }: MatteFrameProps) {
  const router = useRouter();
  const [alpha, setAlpha] = useState(true);
  const [painted, setPainted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const key = verifyFrameKey(frame);
  const pen = useAlphaPen(key);
  const { setArmed } = pen;
  useEffect(() => setArmed(true), [setArmed]);
  /** Gemalte Pixel schlagen den Serverstand: die Zahlen sind ab dem Speichern wieder SAM's. */
  const alphaFrom = painted ? "pending" : frame.alpha;

  /** Pixel, sonst nichts: die Zahlen bleiben SAM's, bis `occluders recut` gelaufen ist. */
  const saveAlpha = useCallback(async () => {
    const mask = pen.maskPng();
    if (!mask) return;
    await post(`/api/matte/${session.name}/${frame.stem}`, { mask });
    setPainted(Date.now());
    setNotice("Alpha gespeichert — die Zahlen sind noch SAM's, bis `occluders recut` gelaufen ist");
    pen.reset();
  }, [frame.stem, pen, session.name]);

  /** ⏎ ist der ganze uebliche Frame: erst die offenen Striche sichern, dann das Urteil. */
  const judge = useCallback(
    async (verdict: MatteVerdict) => {
      try {
        if (verdict === "matte-ok") await saveAlpha();
        await onJudge(verdict);
      } catch (e) {
        setError(String(e));
      }
    },
    [onJudge, saveAlpha],
  );

  const recut = useCallback(async () => {
    setNotice("recut läuft …");
    try {
      const answer = await post<{ done: string }>(`/api/matte/${session.name}`, { recut: true });
      setNotice(answer.done);
      router.refresh();
    } catch (e) {
      setNotice(null);
      setError(String(e));
    }
  }, [router, session.name]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (inField(event)) return;
      const hit: Record<string, () => void> = {
        Enter: () => void judge("matte-ok"),
        x: () => void judge("matte-bad"),
        c: () => void onClean().catch((err) => setError(String(err))),
        Escape: () => onClose(),
        m: () => setAlpha((v) => !v),
        e: () => pen.setErase(!pen.erase),
        "[": () => pen.resize(-1),
        "]": () => pen.resize(1),
        z: () => pen.undo(),
        s: () => void saveAlpha().catch((err) => setError(String(err))),
      };
      const run = hit[event.key];
      if (!run) return;
      event.preventDefault();
      run();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [judge, onClean, onClose, pen, saveAlpha]);

  return (
    <section className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 text-xs">
        <Button className={TOUCH} onClick={() => onClose()} size="sm" variant="outline">
          ⎋ Raster
        </Button>
        <span className="text-muted-foreground truncate font-mono">
          {session.sessionId} · {frame.stem} · ply {frame.ply}
          {frame.reason ? ` · ${frame.reason}` : ""}
        </span>
        {/* Der Hand im Alpha gehoert ein Zug: `last` hat das Brett gemacht, `next` wird gerade
            hineingespielt — das sagt, welche Form die Maske ueberhaupt haben kann. */}
        <span className="font-mono">
          <span className="text-foreground">
            {frame.last ? moveLabel(frame.last.ply, frame.last.san) : "Startstellung"}
          </span>
          <span className="text-muted-foreground">
            {" → "}
            {frame.next ? moveLabel(frame.next.ply, frame.next.san) : "Partieende"}
          </span>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="font-mono text-amber-300 tabular-nums">
              {frame.covered.length} Felder &gt; {PIECE_VISIBLE_MAX}
            </span>
          </TooltipTrigger>
          <TooltipContent>{frame.covered.join(" ") || "kein Feld über der Schwelle"}</TooltipContent>
        </Tooltip>
        <span className="text-muted-foreground font-mono">
          {Object.entries(frame.concepts).map(([c, p]) => `${c} ${p}`).join(" · ") || "keine Konzepte"}
        </span>
      </div>

      {alphaFrom === "sam" ? null : (
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-1.5 text-xs ${
            alphaFrom === "pending"
              ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
              : "border-green-600/50 text-green-300"
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
        <Button className={TOUCH} onClick={() => void judge("matte-ok")} size="sm">
          ⏎ Alpha stimmt{pen.strokes > 0 ? ` · ${pen.strokes} Striche` : ""}
        </Button>
        <Button className={TOUCH} onClick={() => void judge("matte-bad")} size="sm" variant="outline">
          <span className="text-muted-foreground mr-1 font-mono">x</span> Matte taugt nichts
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={TOUCH}
              onClick={() => void onClean().catch((e) => setError(String(e)))}
              size="sm"
              variant="outline"
            >
              <span className="text-muted-foreground mr-1 font-mono">c</span> keine Überlagerung
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Schreibt ein LEERES Alpha: SAMs Fund war keiner. Nach <code>occluders recut</code> steht
            die Coverage des Frames auf 0, keine Zelle ist mehr maskiert.
          </TooltipContent>
        </Tooltip>
        <AlphaPenControls onSave={() => void saveAlpha().catch((e) => setError(String(e)))} pen={pen} />
        <Button
          className={`${TOUCH} ml-auto`}
          onClick={(event) => {
            event.currentTarget.blur();
            setAlpha((v) => !v);
          }}
          size="sm"
          variant={alpha ? "default" : "outline"}
        >
          <span className="mr-1 font-mono">m</span> Alpha
        </Button>
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
              src={`/api/matte/${session.name}/${frame.stem}?size=720&v=${painted}`}
              unoptimized
            />
          ) : null
        }
        src={`/api/board/${session.name}/${frame.stem}?size=720`}
        tool={<AlphaPenLayer pen={pen} />}
      />

      {notice ? <Notice tone="warn">{notice}</Notice> : null}
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
