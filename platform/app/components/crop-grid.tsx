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

/**
 * The smallest a crop may be drawn, in CSS pixels — the grid fits as many columns as that allows.
 *
 * A fixed ten columns is ten crops of ~34 px on a 390 px phone, which is what "die Bilder sind viel
 * zu klein, nahezu unmöglich zu bedienen" (2026-08-13) describes. Three big ones beat ten
 * unreadable ones; the desktop still gets its ten because the same rule fills a wide screen.
 */
export const MIN_CELL = 104;

/** Fetched at 2x so the crop stays sharp on a phone's 3x display — detail IS the decision here. */
export const CROP = 192;

export type GridCell = {
  key: string;
  src: string;
  alt: string;
  /** Bottom-left, always: which square, and the number that raised it. */
  caption: string;
  /** Second line — the audit lane's `predicted` beside the FEN's word (CONCEPT.md 4.2). */
  note?: string;
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
  /** Wischen wie mit dem Brett-Pinsel: SETZT den Zustand jeder berührten Zelle, kein Toggle. */
  onSweep?: (index: number, mode: "left" | "right") => void;
  /** How many columns `auto-fill` chose — up/down must move by the row the user actually sees. */
  onColumns?: (cols: number) => void;
};

export function CropGrid({ cells, cursor, marked, onPick, wrong, onContextPick, onSweep, onColumns }: CropGridProps) {
  const painting = useRef<{ mode: "left" | "right"; start: number; dragged: boolean } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(10);
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
      className="grid select-none grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-1.5 2xl:grid-cols-10"
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
          className={`cursor-pointer overflow-hidden rounded border-2 ${
            marked.has(i)
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
                  painting.current = { mode: event.button === 2 ? "right" : "left", start: i, dragged: false };
                }
              : undefined
          }
          onPointerEnter={
            onSweep
              ? () => {
                  const p = painting.current;
                  if (!p) return;
                  if (!p.dragged) {
                    p.dragged = true;
                    onSweep(p.start, p.mode);
                  }
                  onSweep(i, p.mode);
                }
              : undefined
          }
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
          <Image
            alt={cell.alt}
            className="h-auto w-full"
            height={CROP}
            src={cell.src}
            unoptimized
            width={CROP}
          />
          {/* Unter dem Bild, nie darauf: die Pixel SIND die Entscheidung („einfacher wäre es wenn
              ich das bild ganz sehe und unter der card dann die echten namen", 2026-08-15). */}
          <div className="px-1 py-0.5 font-mono text-[11px] leading-tight">
            {cell.caption}
            {cell.note ? (
              <span className="block text-sm font-bold text-fuchsia-300">{cell.note}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
