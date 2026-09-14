"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { StreamBoard, StreamSession } from "@/lib/label-stream";
import { FRAME_LANE_SET } from "@/lib/lanes";
import type { LaneActions } from "./stream";

export type FrameVerdict = "matte" | "unusable";

export type FrameLaneProps = {
  frames: StreamBoard[];
  sessions: StreamSession[];
  at: number;
  onAt: (at: number) => void;
  onVerdict: (frame: StreamBoard, verdict: FrameVerdict) => void;
  actionsRef: RefObject<LaneActions>;
};

const TOUCH = "max-sm:h-11 max-sm:px-3";

/**
 * Ein Urteil ueber das GANZE Bild, keine 64 Zellen. Zwei Wege, und sie wiegen verschieden: die
 * Matte schickt das Frame weiter (danach fragt die Strittig-Lane seine Crops), `unbrauchbar` wirft
 * es weg. Deshalb hat nur der leichte Weg eine Taste — ⏎ — und der schwere nur den roten Knopf.
 */
export function FrameLane({ frames, sessions, at, onAt, onVerdict, actionsRef }: FrameLaneProps) {
  const index = Math.min(at, frames.length - 1);
  const frame = frames[index];
  const now = useRef({ frame, index, onAt, onVerdict, length: frames.length });
  useEffect(() => {
    now.current = { frame, index, onAt, onVerdict, length: frames.length };
  });
  useEffect(() => {
    actionsRef.current = {
      commit: () => {
        const { frame: f, index: i, onAt: go, onVerdict: verdict, length } = now.current;
        if (!f) return;
        verdict(f, "matte");
        go(Math.min(i + 1, length - 1));
      },
      step: (delta) =>
        now.current.onAt(Math.max(0, Math.min(now.current.length - 1, now.current.index + delta))),
      undo: () => false,
    };
  }, [actionsRef]);

  if (!frame) return <p className="text-muted-foreground text-sm">Diese Lane ist abgearbeitet.</p>;
  const session = sessions[frame.session];

  return (
    <div className="space-y-3">
      <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
        <span className="bg-background rounded border px-2 py-0.5 font-mono text-lg font-bold">
          {frame.dirtyReason ?? "dirty"}
        </span>
        <span className="text-muted-foreground font-mono">
          {session.name} · {frame.stem} · ply {frame.ply}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground text-xs">{FRAME_LANE_SET}</span>
          </TooltipTrigger>
          <TooltipContent>
            Diese Lane zeigt genau den Stapel, ueber den nie jemand entschieden hat. `occluded`
            geht seinen eigenen Weg ueber SAM und die Zell-Lanes.
          </TooltipContent>
        </Tooltip>
        <Button className={`ml-auto ${TOUCH}`} onClick={(e) => { e.currentTarget.blur(); actionsRef.current.commit?.(); }} size="sm">
          ⏎ matten lassen
        </Button>
        <Button
          className={TOUCH}
          onClick={(e) => {
            e.currentTarget.blur();
            onVerdict(frame, "unusable");
          }}
          size="sm"
          variant="destructive"
        >
          unbrauchbar — 64 Zellen raus
        </Button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- ein Brett, vom Server geschnitten */}
      <img
        alt={`Brett ${frame.stem}`}
        className="border-border w-full max-w-[720px] rounded-lg border"
        src={`/api/board/${session.name}/${frame.stem}?size=720`}
      />

      <div className="flex items-center gap-2">
        <Button className={TOUCH} disabled={index === 0} onClick={() => onAt(index - 1)} size="sm" variant="outline">
          ←
        </Button>
        <Button
          className={TOUCH}
          disabled={index + 1 >= frames.length}
          onClick={() => onAt(index + 1)}
          size="sm"
          variant="outline"
        >
          →
        </Button>
        <span className="text-muted-foreground text-xs">
          Die Matte schickt das Frame an SAM (`occluders alpha-worker --wanted`); danach sind seine
          Crops Sache der Strittig-Lane. `unbrauchbar` setzt das Flag im log.jsonl — Slice und Matte
          ueberspringen die Zeile dann beide.
        </span>
      </div>
    </div>
  );
}
