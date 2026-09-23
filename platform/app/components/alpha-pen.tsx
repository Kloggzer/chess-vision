"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** Strokes on a canvas over the straightened board: a two-colour stencil the server burns into
 *  `mattes/<stem>.fixed.webp`. Red raises the alpha, cyan lowers it. */
const PEN_CANVAS = 720;
const UP_COLOR = "rgb(255,0,0)";
const DOWN_COLOR = "rgb(0,255,255)";
const BRUSH_STEPS = [4, 8, 12, 20, 32, 48, 72, 104];
const NONE: Stroke[] = [];

type Stroke = { erase: boolean; size: number; points: [number, number][] };

/** Outside React by design: a remount must not throw away an unsaved stroke. */
const DRAWN = new Map<string, Stroke[]>();

export type PenState = {
  armed: boolean;
  setArmed: (on: boolean) => void;
  erase: boolean;
  setErase: (on: boolean) => void;
  size: number;
  resize: (delta: number) => void;
  strokes: number;
  undo: () => void;
  reset: () => void;
  /** The stencil as a base64 PNG, or null when nobody drew — the wire format of the POST. */
  maskPng: () => string | null;
  attach: (canvas: HTMLCanvasElement | null) => void;
  push: (stroke: Stroke) => void;
  /** Mid-drag feedback; the committed stroke is redrawn from the list on the next render. */
  drawLive: (stroke: Stroke) => void;
};

function render(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  ctx.strokeStyle = ctx.fillStyle = stroke.erase ? DOWN_COLOR : UP_COLOR;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const [first, ...rest] = stroke.points;
  if (!first) return;
  ctx.beginPath();
  if (rest.length === 0) {
    ctx.arc(first[0], first[1], stroke.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.moveTo(first[0], first[1]);
  for (const [x, y] of rest) ctx.lineTo(x, y);
  ctx.stroke();
}

export function useAlphaPen(boardKey: string): PenState {
  const [armed, setArmed] = useState(false);
  const [erase, setErase] = useState(false);
  const [step, setStep] = useState(3);
  const [, bump] = useState(0);
  const [canvas, attach] = useState<HTMLCanvasElement | null>(null);
  const strokes = DRAWN.get(boardKey) ?? NONE;

  // The canvas is a pure render of the stroke list, so undo is a pop and not a snapshot stack:
  // one 720² ImageData per step costs 2 MB, and tracing a hand takes dozens of strokes.
  useEffect(() => {
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, PEN_CANVAS, PEN_CANVAS);
    for (const stroke of strokes) render(ctx, stroke);
  }, [canvas, strokes]);

  const edit = useCallback(
    (next: (was: Stroke[]) => Stroke[]) => {
      const now = next(DRAWN.get(boardKey) ?? NONE);
      if (now.length === 0) DRAWN.delete(boardKey);
      else DRAWN.set(boardKey, now);
      bump((n) => n + 1);
    },
    [boardKey],
  );

  return {
    armed,
    setArmed,
    erase,
    setErase,
    size: BRUSH_STEPS[step],
    resize: useCallback((delta: number) => {
      setStep((s) => Math.max(0, Math.min(BRUSH_STEPS.length - 1, s + delta)));
    }, []),
    strokes: strokes.length,
    undo: useCallback(() => edit((was) => was.slice(0, -1)), [edit]),
    reset: useCallback(() => edit(() => NONE), [edit]),
    maskPng: useCallback(
      () => (strokes.length === 0 ? null : (canvas?.toDataURL("image/png") ?? null)),
      [canvas, strokes.length],
    ),
    attach,
    push: useCallback((stroke: Stroke) => edit((was) => [...was, stroke]), [edit]),
    drawLive: useCallback(
      (stroke: Stroke) => {
        const ctx = canvas?.getContext("2d");
        if (ctx) render(ctx, stroke);
      },
      [canvas],
    ),
  };
}

/** Sits ABOVE the label grid: an armed pen must not also cycle the square under the stroke. */
export function AlphaPenLayer({ pen }: { pen: PenState }) {
  const drag = useRef<Stroke | null>(null);

  const at = (event: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = event.currentTarget.getBoundingClientRect();
    return [
      ((event.clientX - r.left) / r.width) * PEN_CANVAS,
      ((event.clientY - r.top) / r.height) * PEN_CANVAS,
    ];
  };

  return (
    <canvas
      className={`absolute inset-0 h-full w-full opacity-60 ${pen.armed ? "cursor-crosshair" : "pointer-events-none"}`}
      height={PEN_CANVAS}
      onPointerDown={(event) => {
        if (!pen.armed) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { erase: pen.erase || event.button === 2, size: pen.size, points: [at(event)] };
        pen.drawLive(drag.current);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        drag.current.points.push(at(event));
        pen.drawLive(drag.current);
      }}
      onPointerUp={() => {
        const stroke = drag.current;
        drag.current = null;
        if (stroke) pen.push(stroke);
      }}
      ref={(el) => {
        pen.attach(el);
      }}
      style={{ touchAction: "none" }}
      width={PEN_CANVAS}
    />
  );
}

const TOUCH = "max-sm:h-11 max-sm:px-3";

export function AlphaPenControls({ pen, onSave }: { pen: PenState; onSave: () => void }) {
  return (
    <>
      <Button
        className={TOUCH}
        onClick={(event) => {
          event.currentTarget.blur();
          pen.setArmed(!pen.armed);
        }}
        size="sm"
        variant={pen.armed ? "default" : "outline"}
      >
        <span className="mr-1 font-mono">p</span> Pinsel
      </Button>
      {pen.armed ? (
        <>
          <Button className={TOUCH} onClick={() => pen.setErase(!pen.erase)} size="sm" variant="secondary">
            <span className="mr-1 font-mono">e</span> {pen.erase ? "Alpha runter" : "Alpha rauf"}
          </Button>
          <Button className={TOUCH} onClick={() => pen.resize(-1)} size="sm" variant="outline">
            [
          </Button>
          <span className="text-muted-foreground w-8 text-center font-mono text-xs tabular-nums">{pen.size}</span>
          <Button className={TOUCH} onClick={() => pen.resize(1)} size="sm" variant="outline">
            ]
          </Button>
          <Button className={TOUCH} disabled={pen.strokes === 0} onClick={pen.undo} size="sm" variant="outline">
            <span className="mr-1 font-mono">z</span> zurück
          </Button>
          <Button className={TOUCH} disabled={pen.strokes === 0} onClick={onSave} size="sm" variant="secondary">
            <span className="mr-1 font-mono">s</span> Alpha speichern
          </Button>
        </>
      ) : null}
    </>
  );
}
