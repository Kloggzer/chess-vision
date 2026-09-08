"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { FrameStem } from "@/lib/data";
import type { MoveSquares } from "@/lib/review-cards";

/**
 * Vorher gegen Nachher — die Kamera steht fest, also ist der Unterschied zweier Frames GENAU der
 * Zug. Wer nur das Bild danach sieht, liest Holz; wer beide übereinander sieht, sieht die Figur
 * springen. Das Fenster wählt, WIE die beiden übereinandergelegt werden (CONCEPT.md 4.1).
 */
type CompareMode = "off" | "fade" | "blink" | "diff";

export type CompareView = { mode: CompareMode; boost: boolean; loupe: boolean };

export const COMPARE_OFF: CompareView = {
  mode: "off",
  boost: false,
  loupe: false,
};

const MODES: [CompareMode, string, string][] = [
  ["off", "aus", "nur das Bild nach dem Zug"],
  ["fade", "vorher", "Maus aufs Bild: es blendet auf die Stellung VOR dem Zug"],
  [
    "blink",
    "blinken",
    "Maus aufs Bild: es wechselt im Takt zwischen vorher und nachher — was springt, ist der Zug",
  ],
  [
    "diff",
    "differenz",
    "beide Bilder voneinander abgezogen: nur was sich geändert hat, leuchtet. Maus aufs Bild zeigt wieder das rohe Foto",
  ],
];

/** Der Auditor stellt einmal ein und geht dann durch Dutzende Partien. */
const listeners = new Set<() => void>();

function useSticky<T>(key: string, fallback: T): [T, (next: T) => void] {
  const raw = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => void listeners.delete(notify);
    },
    () => localStorage.getItem(key),
    () => null,
  );
  return [
    raw ? (JSON.parse(raw) as T) : fallback,
    (next: T) => {
      localStorage.setItem(key, JSON.stringify(next));
      for (const notify of listeners) notify();
    },
  ];
}

export function useCompareView(): [CompareView, (next: CompareView) => void] {
  return useSticky<CompareView>("confirm.compare", {
    mode: "fade",
    boost: false,
    loupe: true,
  });
}

export function CompareBar({
  view,
  onChange,
}: {
  view: CompareView;
  onChange: (next: CompareView) => void;
}) {
  return (
    <div className="border-border bg-muted/20 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        Vergleich mit der Stellung davor:
      </span>
      {MODES.map(([mode, label, why]) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              onClick={() => onChange({ ...view, mode })}
              size="sm"
              variant={view.mode === mode ? "default" : "outline"}
            >
              {label}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{why}</TooltipContent>
        </Tooltip>
      ))}
      <span className="ml-2 flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-pressed={view.boost}
              onClick={() => onChange({ ...view, boost: !view.boost })}
              size="sm"
              variant={view.boost ? "secondary" : "outline"}
            >
              aufhellen
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            hebt Helligkeit und Kontrast an — die Aufnahmen sind absichtlich
            dunkel
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-pressed={view.loupe}
              onClick={() => onChange({ ...view, loupe: !view.loupe })}
              size="sm"
              variant={view.loupe ? "secondary" : "outline"}
            >
              Feld-Lupe
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            schneidet Start- und Zielfeld gross heraus, vorher über nachher
          </TooltipContent>
        </Tooltip>
      </span>
    </div>
  );
}

/** Der CSS-Filter, der beide Bilder trägt — bei „differenz" härter, weil die Reste sonst schwarz sind. */
export function boostFilter(
  view: CompareView,
  diffing: boolean,
): string | undefined {
  if (diffing)
    return view.boost
      ? "brightness(4) contrast(2.2)"
      : "brightness(2.6) contrast(1.8)";
  return view.boost ? "brightness(1.55) contrast(1.25)" : undefined;
}

/** Blinkt, solange die Maus auf dem Bild liegt — ausserhalb läuft keine Uhr. */
export function useBlink(active: boolean, ms = 550): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setOn((v) => !v), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return active && on;
}

/**
 * Start- und Zielfeld gross, vorher über nachher: die Figur verlässt das obere Feld und steht
 * unten im anderen. Das Brett ist die obere [width]x[width] des Frames, a8 links oben.
 */
export function SquareLoupe({
  name,
  squares,
  before,
  after,
  view,
  size = 52,
}: {
  name: string;
  squares: MoveSquares[];
  before: FrameStem;
  after: FrameStem;
  view: CompareView;
  size?: number;
}) {
  const cells = [...new Set(squares.flatMap((s) => [s.from, s.to]))].slice(
    0,
    4,
  );
  if (cells.length === 0) return null;
  const tile = (frame: FrameStem, square: string) => {
    const board = 8 * size;
    return {
      backgroundImage: `url(/api/frame/${name}/${frame.stem})`,
      backgroundSize: `${board}px ${(board * frame.height) / frame.width}px`,
      backgroundPosition: `-${(square.charCodeAt(0) - 97) * size}px -${(8 - Number(square[1])) * size}px`,
      filter: boostFilter(view, false),
      height: size,
      width: size,
    };
  };
  return (
    <div className="flex flex-wrap items-start gap-2">
      <div
        className="text-muted-foreground grid shrink-0 text-right text-[10px] leading-none"
        style={{ gridTemplateRows: `${size}px ${size}px` }}
      >
        <span className="self-center">vorher</span>
        <span className="self-center">nachher</span>
      </div>
      {cells.map((square) => (
        <figure className="space-y-0.5" key={square}>
          <div
            className="border-border overflow-hidden rounded border"
            style={tile(before, square)}
          />
          <div
            className="border-border overflow-hidden rounded border border-green-700/70"
            style={tile(after, square)}
          />
          <figcaption className="text-muted-foreground text-center font-mono text-[10px]">
            {square}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
