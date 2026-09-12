"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Crop grid extracted so LABELN stream renders same widget (CONCEPT.md 3.2).
 * Cell grid and board reach different work; folding leaves unsure cells unreachable.
 */

/** One page: 5 Zeilen × 10 Spalten auf dem 16:9-Monitor, ohne Scrollen — die ganze Seite in einem
 *  Blick ist der Punkt der Eine-Behauptung-pro-Seite-Audits (User, 2026-08-15). */
export const PAGE = 50;

/** Fetched at 2x so the crop stays sharp on a phone's 3x display — detail IS the decision here. */
export const CROP = 192;

type GridCell = {
  key: string;
  src: string;
  alt: string;
  /** Bottom-left, always: which square, and the number that raised it. */
  caption: string;
  /** Second line — the audit lane's `predicted` beside the FEN's word (CONCEPT.md 4.2). */
  note?: string;
  /** What the brush has put here, unwritten — the card says the class, not just "markiert". */
  paint?: string;
  /** SAM's coverage on THIS square, already formatted; a crop lane never shows the board beside it. */
  covered?: string;
  /** Das FRAME dieser Karte ist als dirty gemeldet — jede Geschwisterkarte trägt dieselbe Marke. */
  dirty?: boolean;
  /** Eine Hand am BRETT, während dieses Feld frei ist: der Crop verrät es nicht, der Scan schon. */
  boardHand?: { gate: number | null; squares: string[]; here: boolean };
};

export type CropGridProps = {
  cells: GridCell[];
  cursor: number;
  marked: Set<number>;
  onPick: (index: number) => void;
  /** „stimmt nicht, aber unentschieden" — gestrichelt, wird nirgends geschrieben (Audit-Lane). */
  wrong?: Set<number>;
  /** Rechtsklick, wo eine Lane ihm eine zweite Antwort gibt (Audit: „das Modell hat recht"). */
  onContextPick?: (index: number) => void;
  /** Wischen wie mit dem Brett-Pinsel: SETZT jede berührte Zelle — oder LÖSCHT, wenn der Wisch
   *  auf einer schon so markierten Zelle beginnt (der Radierer des Pinsels, 2026-08-15). */
  onSweep?: (index: number, mode: "left" | "right", erase: boolean) => void;
  /** Was „schon so markiert" heißt, wo die Marke mehr als an/aus ist — der Pinsel kennt seine Farbe. */
  erasing?: (index: number, mode: "left" | "right") => boolean;
  /** Hält die Pinsel-Zeile frei, auch wo nichts gemalt ist: sonst wächst die Karte unterm Klick. */
  paintable?: boolean;
  /** Welche Zelle der Zeiger gerade berührt, `null` beim Verlassen — die Lupe hängt daran. */
  onHover?: (index: number | null) => void;
  /** How many columns `auto-fill` chose — up/down must move by the row the user actually sees. */
  onColumns?: (cols: number) => void;
  /** Die Ecken-Hand: meldet das GANZE Frame der Karte, ein zweiter Druck nimmt es zurück. */
  onDirty?: (index: number) => void;
};

/**
 * Eat the ONE context menu a right-drag ends with, wherever the pointer happens to be.
 *
 * The grid swallows its own, but a wisch that leaves it entirely fires the menu on whatever element
 * it was released over — and a browser menu opening mid-brush is exactly what it feels like.
 * Capture phase, once, and self-removing so a later honest right-click still works.
 */
function swallowNextContextMenu(): void {
  const eat = (event: Event) => {
    event.preventDefault();
    document.removeEventListener("contextmenu", eat, true);
  };
  document.addEventListener("contextmenu", eat, true);
  // A right-press that never becomes a menu (the pointer left the window) must not leave the
  // listener armed for the next honest click somewhere else.
  window.setTimeout(() => document.removeEventListener("contextmenu", eat, true), 2000);
}


/** Eine Hand über einer Fläche — das Brett, nicht dieses Feld. Inline wie `board-frames.tsx`,
 *  die App zieht für ein Zeichen keine Icon-Bibliothek. */
function BoardHandMark() {
  return (
    <svg aria-hidden className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 16 16">
      <path
        d="M4.7 8.6V4.3a.85.85 0 1 1 1.7 0V2.7a.85.85 0 1 1 1.7 0v.4a.85.85 0 1 1 1.7 0v1.3a.85.85 0 1 1 1.7 0v4.2c0 2.1-1.3 3.3-3.4 3.3-1.7 0-2.6-.7-3.3-2L3.1 8.2a.9.9 0 0 1 1.4-1z"
        fill="currentColor"
      />
      <path d="M1 14.6h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

const handTitle = (hand: NonNullable<GridCell["boardHand"]>): string =>
  [
    `Hand am Brett (Gate ${hand.gate === null ? "alt, ohne Wert" : hand.gate.toFixed(2)})`,
    hand.here
      ? "Die Rillen nennen AUCH DIESES Feld — der Crop sieht trotzdem frei aus."
      : hand.squares.length > 0
        ? `Rillen: ${hand.squares.join(" ")}`
        : "Welche Felder, sagt der Rillen-Sensor auf diesem Frame nicht.",
    "Der FEN gilt hier nur, wenn die Stellung darunter schon steht.",
  ].join(" · ");

export function CropGrid(props: CropGridProps) {
  const { cells, cursor, marked, onPick, wrong, onContextPick, onSweep, erasing, paintable,
    onHover, onColumns, onDirty } = props;
  const painting = useRef<{ mode: "left" | "right"; start: number; dragged: boolean; erase: boolean } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
  // A 404 crop rendered as an empty box on the dark card, indistinguishable from a genuinely dark
  // square (2026-09-07). Keyed by URL, so a re-export retries instead of staying broken forever.
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set());
  // The column count is the BROWSER's answer, not ours: `auto-fill` decides it from the width.
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () =>
      setCols(Math.max(1, window.getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cells.length]);
  useEffect(() => onColumns?.(cols), [cols, onColumns]);
  return (
    <div
      // 104 px is the smallest crop a thumb can hit: ten fixed columns are ~34 px on a 390 px
      // phone ("nahezu unmöglich zu bedienen", 2026-08-13). Tailwind cannot read a constant here.
      className="grid select-none grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1.5 2xl:grid-cols-10"
      // Auch auf der FLÄCHE, nicht nur auf den Zellen: ein Rechts-Wisch, der in einer Lücke oder
      // neben dem Raster endet, liess sonst das Browser-Menü aufspringen — mitten im Pinseln.
      onContextMenu={onSweep || onContextPick ? (event) => event.preventDefault() : undefined}
      onPointerLeave={() => {
        painting.current = null;
      }}
      onPointerUp={() => {
        painting.current = null;
      }}
      ref={grid}
    >
      {cells.map((cell, i) => (
        <div
          className={`group relative cursor-pointer overflow-hidden rounded border-2 ${
            cell.paint
              ? "border-primary"
              : marked.has(i)
                ? "border-amber-500"
                : wrong?.has(i)
                  ? "border-destructive border-dashed"
                  : "border-transparent"
          } ${i === cursor ? "ring-primary ring-2" : ""}`}
          key={cell.key}
          onClick={onSweep ? undefined : () => onPick(i)}
          onContextMenu={
            onContextPick || onSweep
              ? (event) => {
                  event.preventDefault();
                  if (!onSweep) onContextPick?.(i);
                }
              : undefined
          }
          onPointerDown={
            onSweep
              ? (event) => {
                  if (event.button !== 0 && event.button !== 2) return;
                  const mode = event.button === 2 ? "right" : "left";
                  const erase = erasing
                    ? erasing(i, mode)
                    : mode === "right"
                      ? marked.has(i)
                      : (wrong?.has(i) ?? false);
                  painting.current = { mode, start: i, dragged: false, erase };
                  if (mode === "right") swallowNextContextMenu();
                }
              : undefined
          }
          onPointerEnter={
            onSweep || onHover
              ? () => {
                  onHover?.(i);
                  const p = painting.current;
                  if (!p || !onSweep) return;
                  if (!p.dragged) {
                    p.dragged = true;
                    onSweep(p.start, p.mode, p.erase);
                  }
                  onSweep(i, p.mode, p.erase);
                }
              : undefined
          }
          onPointerLeave={onHover ? () => onHover(null) : undefined}
          onPointerUp={
            onSweep
              ? (event) => {
                  event.stopPropagation();
                  const p = painting.current;
                  painting.current = null;
                  if (!p) return;
                  // Ohne Zug bleibt der Klick der Toggle; ein Wisch hat die Zelle schon gesetzt.
                  if (!p.dragged) (p.mode === "right" ? onContextPick : onPick)?.(i);
                }
              : undefined
          }
          role="button"
          tabIndex={-1}
        >
          {broken.has(cell.src) ? (
            <div
              className="border-destructive/60 bg-destructive/10 text-destructive pointer-events-none flex aspect-square w-full items-center justify-center border-b px-1 text-center font-mono text-[11px] leading-tight"
              title={`${cell.src} antwortet nicht — Server-Log oder die URL direkt aufrufen`}
            >
              Crop fehlt
            </div>
          ) : (
            <Image
              alt={cell.alt}
              className="pointer-events-none h-auto w-full"
              draggable={false}
              height={CROP}
              onError={() => setBroken((was) => new Set(was).add(cell.src))}
              src={cell.src}
              unoptimized
              width={CROP}
            />
          )}
          {onDirty ? (
            // Ein eigener Knopf, kein Klick aufs Bild: links malt der Pinsel, rechts gewinnt das
            // Modell, und beide dürfen von der Hand-Marke nicht getroffen werden.
            <button
              aria-label={cell.dirty ? "dirty-Meldung des Frames zurücknehmen" : "ganzes Frame als dirty melden"}
              className={`absolute top-0 left-0 z-10 rounded-br px-1 font-mono text-[11px] leading-tight ${
                cell.dirty
                  ? "bg-amber-500 font-bold text-black"
                  : "bg-background/70 text-muted-foreground pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-amber-500 hover:text-black"
              }`}
              onClick={(event) => {
                event.stopPropagation();
                event.currentTarget.blur();
                onDirty(i);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              tabIndex={-1}
              title={
                cell.dirty
                  ? "Dieses FRAME ist als dirty gemeldet (alle 64 Felder) — klicken nimmt die Meldung zurück"
                  : "Hand drauf? Meldet das GANZE Frame dieser Karte, nicht nur dieses Feld"
              }
              type="button"
            >
              {cell.dirty ? "🖐 dirty" : "🖐"}
            </button>
          ) : null}
          <div className="pointer-events-none absolute top-0 right-0 flex flex-col items-end">
            {cell.covered ? (
              <span className="bg-background/70 rounded-bl px-1 font-mono text-[11px] leading-tight tabular-nums text-amber-200">
                {cell.covered}
              </span>
            ) : null}
            {cell.boardHand ? (
              <span
                className={`mt-px flex items-center gap-0.5 rounded-l px-1 font-mono text-[11px] leading-tight tabular-nums ${
                  cell.boardHand.here ? "bg-amber-500 font-bold text-black" : "bg-background/70 text-amber-300"
                }`}
                title={handTitle(cell.boardHand)}
              >
                <BoardHandMark />
                {cell.boardHand.gate === null ? "?" : Math.round(cell.boardHand.gate * 100)}
              </span>
            ) : null}
          </div>
          {/* Unter dem Bild, nie darauf: die Pixel SIND die Entscheidung („einfacher wäre es wenn
              ich das bild ganz sehe und unter der card dann die echten namen", 2026-08-15). */}
          <div className="px-1 py-0.5 font-mono text-[11px] leading-tight">
            {cell.caption}
            {cell.note ? (
              <span className="block text-sm font-bold text-fuchsia-300">{cell.note}</span>
            ) : null}
            {paintable ? (
              <span className="text-primary block h-5 text-sm leading-5 font-bold">
                {cell.paint ? `→ ${cell.paint}` : ""}
              </span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
